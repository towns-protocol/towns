import {
    Address,
    ISpaceDapp,
    LegacySpaceInfoStruct,
    SpaceDapp,
    createEntitlementStruct,
    createLegacyEntitlementStruct,
    UpdateRoleParams,
    LegacyUpdateRoleParams,
    Space,
    findDynamicPricingModule,
    findFixedPricingModule,
    NoopRuleData,
    stringifyChannelMetadataJSON,
    SetChannelPermissionOverridesParams,
    ClearChannelPermissionOverridesParams,
    IArchitectBase,
} from '@river-build/web3'
import { ethers } from 'ethers'
import isEqual from 'lodash/isEqual'
import { UserOpsConfig, UserOpParams, FunctionHash, TimeTracker, TimeTrackerEvents } from './types'
import { userOpsStore } from './userOpsStore'
import { ERC4337 } from 'userop/dist/constants'
import { CodeException } from './errors'
import { UserOperationEventEvent } from 'userop/dist/typechain/EntryPoint'
import { EVERYONE_ADDRESS, getFunctionSigHash, isUsingAlchemyBundler } from './utils'
import {
    signUserOpHash,
    estimateGasLimit,
    estimateAlchemyGasFees,
    subtractGasFromMaxValue,
    promptUser,
    isSponsoredOp,
    paymasterProxyMiddleware,
    saveOpToUserOpsStore,
    totalCostOfUserOp,
    balanceOf,
} from './middlewares'
import { MiddlewareVars } from './MiddlewareVars'
import { abstractAddressMap } from './abstractAddressMap'
import { TownsSimpleAccount } from './TownsSimpleAccount'
import { getGasPrice as getEthMaxPriorityFeePerGas } from 'userop/dist/preset/middleware'
import { TownsUserOpClient, TownsUserOpClientSendUserOperationResponse } from './TownsUserOpClient'
import { getTransferCallData } from './generateTransferCallData'
import { sendUserOperationWithRetry } from './sendUserOperationWithRetry'
import { getInitData } from './workers'

export class UserOps {
    private bundlerUrl: string
    private aaRpcUrl: string
    private paymasterProxyUrl: string | undefined
    // defaults to Stackup's deployed entry point
    private entryPointAddress: string | undefined
    // defaults to Stackup's deployed factory
    private factoryAddress: string | undefined
    private paymasterProxyAuthSecret: string | undefined
    private skipPromptUserOnPMRejectedOp = false
    private userOpClient: Promise<TownsUserOpClient> | undefined
    private builder: Promise<TownsSimpleAccount> | undefined
    protected spaceDapp: ISpaceDapp | undefined
    private timeTracker: TimeTracker | undefined
    private fetchAccessTokenFn: (() => Promise<string | null>) | undefined
    private middlewareInitialized = false
    public middlewareVars: MiddlewareVars

    constructor(
        config: UserOpsConfig & {
            spaceDapp: ISpaceDapp
            timeTracker?: TimeTracker
        },
    ) {
        this.bundlerUrl = config.bundlerUrl ?? ''
        this.aaRpcUrl = config.aaRpcUrl
        this.paymasterProxyUrl = config.paymasterProxyUrl
        this.entryPointAddress = config.entryPointAddress ?? ERC4337.EntryPoint
        this.factoryAddress = config.factoryAddress ?? ERC4337.SimpleAccount.Factory
        this.paymasterProxyAuthSecret = config.paymasterProxyAuthSecret
        this.spaceDapp = config.spaceDapp
        this.skipPromptUserOnPMRejectedOp = config.skipPromptUserOnPMRejectedOp
        this.timeTracker = config.timeTracker
        this.fetchAccessTokenFn = config.fetchAccessTokenFn
        this.middlewareVars = new MiddlewareVars({
            operationAttempt: 1,
        })
    }

    // TODO: extract this to a separate function b/c client uses this to get AA address for all users
    public async getAbstractAccountAddress({
        rootKeyAddress,
    }: {
        rootKeyAddress: Address
    }): Promise<Address | undefined> {
        if (abstractAddressMap.get(rootKeyAddress)) {
            return abstractAddressMap.get(rootKeyAddress)
        }

        if (!this.factoryAddress) {
            throw new Error('factoryAddress is required')
        }
        if (!this.entryPointAddress) {
            throw new Error('entryPointAddress is required')
        }
        if (!this.spaceDapp?.provider) {
            throw new Error('spaceDapp is required')
        }
        const result = await getInitData({
            factoryAddress: this.factoryAddress,
            signerAddress: rootKeyAddress,
            rpcUrl: this.aaRpcUrl,
        })

        abstractAddressMap.set(rootKeyAddress, result.addr)
        return result.addr as Address
    }

    public async getUserOpClient() {
        if (!this.userOpClient) {
            this.userOpClient = TownsUserOpClient.init(this.aaRpcUrl, {
                entryPoint: this.entryPointAddress,
                overrideBundlerRpc: this.bundlerUrl,
            })
        }
        return this.userOpClient
    }

    public async sendUserOp(
        args: UserOpParams & {
            // a function signature hash to pass to paymaster proxy - this is just the function name for now
            functionHashForPaymasterProxy: FunctionHash
            spaceId: string | undefined
            retryCount?: number
        },
        sequenceName?: TimeTrackerEvents,
    ): Promise<TownsUserOpClientSendUserOperationResponse> {
        const { toAddress, callData, value } = args

        // new op, reset the middleware props
        this.middlewareVars.reset({
            sequenceName,
            functionHashForPaymasterProxy: args.functionHashForPaymasterProxy,
            spaceId: args.spaceId,
            txValue: args.value,
        })

        const timeTracker = this.timeTracker

        let endInitBuilder: (() => void) | undefined
        if (sequenceName) {
            endInitBuilder = timeTracker?.startMeasurement(sequenceName, 'userops_init_builder')
        }

        const builder = await this.getBuilder({ signer: args.signer })
        this.addMiddleware({ builder, signer: args.signer })

        endInitBuilder?.()

        if (!toAddress) {
            throw new Error('toAddress is required')
        }
        if (!callData) {
            throw new Error('callData is required')
        }

        let simpleAccount: TownsSimpleAccount
        if (Array.isArray(toAddress)) {
            if (!Array.isArray(callData)) {
                throw new Error('callData must be an array if toAddress is an array')
            }
            if (toAddress.length !== callData.length) {
                throw new Error('toAddress and callData must be the same length')
            }
            simpleAccount = builder.executeBatch(toAddress, callData)
        } else {
            if (Array.isArray(callData)) {
                throw new Error('callData must be a string if toAddress is a string')
            }
            /**
             * IMPORTANT: This value can result in RPC errors if the smart account has insufficient funds
             *
             * If estimating user operation gas, you can override sender balance via state overrides https://docs.stackup.sh/docs/erc-4337-bundler-rpc-methods#eth_senduseroperation
             * which we are doing, see prompttUser middleware
             *
             * However, in the case of a tx that costs ETH, but that we also want to sponsor, this value should be 0
             * Otherwise, the paymaster will reject the operation if the user does not have enough funds
             * This kind of tx would be something like joining a town that has a fixed membership cost, but ALSO contains prepaid seats
             */
            simpleAccount = builder.execute(toAddress, value ?? 0, callData)
        }

        let endInitClient: (() => void) | undefined
        if (sequenceName) {
            endInitClient = timeTracker?.startMeasurement(sequenceName, 'userops_init_client')
        }

        const userOpClient = await this.getUserOpClient()

        endInitClient?.()

        return sendUserOperationWithRetry({
            userOpClient,
            simpleAccount,
            retryCount: args.retryCount,
            skipPromptUserOnPMRejectedOp: this.skipPromptUserOnPMRejectedOp,
            middlewareVars: this.middlewareVars,
        })
    }

    public async sendCreateLegacySpaceOp(
        args: Parameters<SpaceDapp['createLegacySpace']>,
    ): Promise<TownsUserOpClientSendUserOperationResponse> {
        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }
        const [createLegacySpaceParams, signer] = args

        const spaceInfo: LegacySpaceInfoStruct = {
            name: createLegacySpaceParams.spaceName,
            uri: createLegacySpaceParams.uri,
            shortDescription: createLegacySpaceParams.shortDescription ?? '',
            longDescription: createLegacySpaceParams.longDescription ?? '',
            membership: createLegacySpaceParams.membership,
            channel: {
                metadata: createLegacySpaceParams.channelName || '',
            },
        }

        const endGetAA = this.timeTracker?.startMeasurement(
            TimeTrackerEvents.CREATE_SPACE,
            'userops_get_abstract_account_address',
        )
        const abstractAccountAddress = await this.getAbstractAccountAddress({
            rootKeyAddress: await getSignerAddress(signer),
        })

        endGetAA?.()

        if (!abstractAccountAddress) {
            throw new Error('abstractAccountAddress is required')
        }

        const createSpaceFnName = 'createSpace'

        const callDataCreateSpace =
            this.spaceDapp.spaceRegistrar.LegacySpaceArchitect.encodeFunctionData(
                createSpaceFnName,
                [spaceInfo],
            )

        const endLinkCheck = this.timeTracker?.startMeasurement(
            TimeTrackerEvents.CREATE_SPACE,
            'userops_check_if_linked',
        )

        if (await this.spaceDapp.walletLink.checkIfLinked(signer, abstractAccountAddress)) {
            endLinkCheck?.()

            const functionHashForPaymasterProxy = getFunctionSigHash(
                this.spaceDapp.spaceRegistrar.LegacySpaceArchitect.interface,
                createSpaceFnName,
            )

            const op = await this.sendUserOp(
                {
                    toAddress: this.spaceDapp.spaceRegistrar.LegacySpaceArchitect.address,
                    callData: callDataCreateSpace,
                    signer,
                    spaceId: undefined,
                    functionHashForPaymasterProxy,
                },
                TimeTrackerEvents.CREATE_SPACE,
            )
            return op
        }
        endLinkCheck?.()

        // wallet isn't linked, create a user op that both links and creates the space
        const functionName = 'createSpace_linkWallet'

        // TODO: this needs to accept an array of names/interfaces
        const functionHashForPaymasterProxy = getFunctionSigHash(
            this.spaceDapp.spaceRegistrar.LegacySpaceArchitect.interface,
            functionName,
        )

        const callDataForLinkingSmartAccount = await this.encodeDataForLinkingSmartAccount(
            signer,
            abstractAccountAddress,
        )

        const op = await this.sendUserOp(
            {
                toAddress: [
                    this.spaceDapp.walletLink.address,
                    this.spaceDapp.spaceRegistrar.LegacySpaceArchitect.address,
                ],
                callData: [callDataForLinkingSmartAccount, callDataCreateSpace],
                signer,
                spaceId: undefined,
                functionHashForPaymasterProxy,
            },
            TimeTrackerEvents.CREATE_SPACE,
        )
        return op
    }

    public async sendCreateSpaceOp(
        args: Parameters<SpaceDapp['createSpace']>,
    ): Promise<TownsUserOpClientSendUserOperationResponse> {
        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }
        const [createpaceParams, signer] = args

        const prepaySupply = createpaceParams.prepaySupply ?? 0

        const spaceInfo: IArchitectBase.CreateSpaceStruct = {
            channel: {
                metadata: createpaceParams.channelName || '',
            },
            metadata: {
                name: createpaceParams.spaceName,
                uri: createpaceParams.uri,
                shortDescription: createpaceParams.shortDescription ?? '',
                longDescription: createpaceParams.longDescription ?? '',
            },
            membership: createpaceParams.membership,
            prepay: {
                supply: prepaySupply,
            },
        }

        const endGetAA = this.timeTracker?.startMeasurement(
            TimeTrackerEvents.CREATE_SPACE,
            'userops_get_abstract_account_address',
        )
        const abstractAccountAddress = await this.getAbstractAccountAddress({
            rootKeyAddress: await getSignerAddress(signer),
        })

        endGetAA?.()

        if (!abstractAccountAddress) {
            throw new Error('abstractAccountAddress is required')
        }

        // stackup-worker identifier,
        // fn is overloaded, but stackup-worker only checks "createSpaceWithPrepay"
        const createSpaceFnName = 'createSpaceWithPrepay'
        const createSpaceShim = this.spaceDapp.spaceRegistrar.CreateSpace

        const callDataCreateSpace = createSpaceShim.encodeFunctionData(
            'createSpaceWithPrepay(((string,string,string,string),((string,string,uint256,uint256,uint64,address,address,uint256,address),(bool,address[],bytes,bool),string[]),(string),(uint256)))',
            [spaceInfo],
        )
        const toContractAddress = createSpaceShim.address

        const endLinkCheck = this.timeTracker?.startMeasurement(
            TimeTrackerEvents.CREATE_SPACE,
            'userops_check_if_linked',
        )

        const cost = (await this.spaceDapp.platformRequirements.getMembershipFee()).mul(
            prepaySupply,
        )

        const hasLinkedWallet = await this.spaceDapp.walletLink.checkIfLinked(
            signer,
            abstractAccountAddress,
        )

        endLinkCheck?.()

        if (hasLinkedWallet) {
            const functionHashForPaymasterProxy = getFunctionSigHash(
                createSpaceShim.interface,
                createSpaceFnName,
            )

            return await this.sendUserOp(
                {
                    toAddress: toContractAddress,
                    callData: callDataCreateSpace,
                    signer,
                    spaceId: undefined,
                    functionHashForPaymasterProxy,
                    value: cost,
                },
                TimeTrackerEvents.CREATE_SPACE,
            )
        } else if (cost.eq(0)) {
            // wallet isn't linked, create a user op that both links and creates the space
            const functionHashForPaymasterProxy = getFunctionSigHash(
                createSpaceShim.interface,
                'createSpace_linkWallet',
            )

            const callDataForLinkingSmartAccount = await this.encodeDataForLinkingSmartAccount(
                signer,
                abstractAccountAddress,
            )

            return await this.sendUserOp(
                {
                    toAddress: [this.spaceDapp.walletLink.address, toContractAddress],
                    callData: [callDataForLinkingSmartAccount, callDataCreateSpace],
                    signer,
                    spaceId: undefined,
                    functionHashForPaymasterProxy,
                },
                TimeTrackerEvents.CREATE_SPACE,
            )
        } else {
            await this.linkWallet(signer, abstractAccountAddress, TimeTrackerEvents.CREATE_SPACE)

            const functionHashForPaymasterProxy = getFunctionSigHash(
                createSpaceShim.interface,
                createSpaceFnName,
            )

            return await this.sendUserOp(
                {
                    toAddress: toContractAddress,
                    callData: callDataCreateSpace,
                    signer,
                    spaceId: undefined,
                    functionHashForPaymasterProxy,
                    value: cost,
                },
                TimeTrackerEvents.CREATE_SPACE,
            )
        }
    }

    private async linkWallet(
        signer: ethers.Signer,
        abstractAccountAddress: Address,
        sequenceName: TimeTrackerEvents,
    ) {
        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }
        const linkWalletUserOp = await this.sendLinkSmartAccountToRootKeyOp(
            signer,
            abstractAccountAddress,
            sequenceName,
        )

        let userOpEventWalletLink: UserOperationEventEvent | null

        try {
            const endLinkRelay = this.timeTracker?.startMeasurement(
                sequenceName,
                'userops_wait_for_link_wallet_relay',
            )
            userOpEventWalletLink = await linkWalletUserOp.wait()
            endLinkRelay?.()
            if (!userOpEventWalletLink?.args.success) {
                throw new CodeException({
                    message: 'Failed to perform user operation for linking wallet',
                    code: 'USER_OPS_FAILED_TO_PERFORM_USER_OPERATION_LINK_WALLET',
                    category: 'userop',
                })
            }
        } catch (error) {
            throw new CodeException({
                message: 'Failed to perform user operation for linking wallet',
                code: 'USER_OPS_FAILED_TO_PERFORM_USER_OPERATION_LINK_WALLET',
                data: error,
                category: 'userop',
            })
        }

        try {
            const endWaitForLinkWalletTx = this.timeTracker?.startMeasurement(
                sequenceName,
                'userops_wait_for_link_wallet_tx',
            )
            const linkWalletReceipt = await this.spaceDapp.provider?.waitForTransaction(
                userOpEventWalletLink.transactionHash,
            )
            endWaitForLinkWalletTx?.()
            if (linkWalletReceipt?.status !== 1) {
                throw new CodeException({
                    message: 'Failed to link wallet',
                    code: 'USER_OPS_FAILED_TO_LINK_WALLET',
                    category: 'userop',
                })
            }
        } catch (error) {
            throw new CodeException({
                message: 'Failed to link wallet',
                code: 'USER_OPS_FAILED_TO_LINK_WALLET',
                data: error,
                category: 'userop',
            })
        }
    }

    private async encodeDataForLinkingSmartAccount(
        rootKeySigner: ethers.Signer,
        abstractAccountAddress: Address,
    ) {
        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }

        if (!abstractAccountAddress) {
            throw new Error('abstractAccountAddress is required')
        }

        return this.spaceDapp.walletLink.encodeLinkCallerToRootKey(
            rootKeySigner,
            abstractAccountAddress,
        )
    }

    public clearStore() {
        userOpsStore.getState().clear()
    }

    /**
     * Join a space, potentially linking a wallet if necessary
     */
    public async sendJoinSpaceOp(
        args: Parameters<SpaceDapp['joinSpace']>,
    ): Promise<TownsUserOpClientSendUserOperationResponse> {
        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }
        const [spaceId, recipient, signer] = args
        const space = this.spaceDapp.getSpace(spaceId)

        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }

        const endGetAA = this.timeTracker?.startMeasurement(
            TimeTrackerEvents.JOIN_SPACE,
            'userops_get_abstract_account_address',
        )

        const abstractAccountAddress = await this.getAbstractAccountAddress({
            rootKeyAddress: await getSignerAddress(signer),
        })
        endGetAA?.()
        if (!abstractAccountAddress) {
            throw new Error('abstractAccountAddress is required')
        }

        const { price: membershipPrice } = await this.spaceDapp.getJoinSpacePriceDetails(spaceId)
        const callDataJoinSpace = space.Membership.encodeFunctionData('joinSpace', [recipient])

        const endCheckLink = this.timeTracker?.startMeasurement(
            TimeTrackerEvents.JOIN_SPACE,
            'userops_check_if_linked',
        )

        if (await this.spaceDapp.walletLink.checkIfLinked(signer, abstractAccountAddress)) {
            endCheckLink?.()
            // they already have a linked wallet, just join the space
            const functionName = 'joinSpace'

            const functionHashForPaymasterProxy = getFunctionSigHash(
                space.Membership.interface,
                functionName,
            )

            // TODO: determine if this simulation causes an additional signature in UX
            // try {
            //     // simulate the tx - throws an error second time you run it!
            //     await space.Membership.write(signer).callStatic.joinSpace(recipient)
            // } catch (error) {
            //     throw this.parseSpaceError(spaceId, error)
            // }

            return this.sendUserOp(
                {
                    toAddress: space.Address,
                    callData: callDataJoinSpace,
                    value: membershipPrice,
                    signer,
                    spaceId: space.SpaceId,
                    functionHashForPaymasterProxy,
                },
                TimeTrackerEvents.JOIN_SPACE,
            )
        }
        endCheckLink?.()

        // if the user does not have a linked wallet, we need to link their smart account first b/c that is where the memberhship NFT will be minted
        // joinSpace might require a value, if the space has a fixed membership cost
        //
        // But SimpleAccount does not support executeBatch with values
        // A new user who is joining a paid space will encounter this scenario
        //
        // Therefore, we need to link the wallet first, then join the space
        // Another smart account contract should support this and allow for a single user operation
        await this.linkWallet(signer, abstractAccountAddress, TimeTrackerEvents.JOIN_SPACE)

        return this.sendUserOp(
            {
                toAddress: space.Address,
                value: membershipPrice,
                callData: callDataJoinSpace,
                signer,
                spaceId: space.SpaceId,
                functionHashForPaymasterProxy: 'joinSpace',
            },
            TimeTrackerEvents.JOIN_SPACE,
        )
    }

    /**
     * User operation to link smart account wallet to the root key.
     * @param args
     */
    public async sendLinkSmartAccountToRootKeyOp(
        rootKeySigner: ethers.Signer,
        abstractAccountAddress: Address,
        sequenceName?: TimeTrackerEvents,
    ): Promise<TownsUserOpClientSendUserOperationResponse> {
        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }
        const signer = rootKeySigner
        const walletLink = this.spaceDapp.walletLink
        const functionName = 'linkCallerToRootKey'

        const functionHashForPaymasterProxy = getFunctionSigHash(
            walletLink.getInterface(),
            functionName,
        )

        const endEncoding = this.timeTracker?.startMeasurement(
            TimeTrackerEvents.JOIN_SPACE,
            'userops_encode_data_for_linking_smart_account',
        )

        const callDataForLinkingSmartAccount = await this.encodeDataForLinkingSmartAccount(
            signer,
            abstractAccountAddress,
        )

        endEncoding?.()

        return this.sendUserOp(
            {
                toAddress: this.spaceDapp.walletLink.address,
                callData: callDataForLinkingSmartAccount,
                signer,
                spaceId: undefined,
                functionHashForPaymasterProxy,
            },
            sequenceName,
        )
    }

    /**
     * User operation to link an EOA (NOT smart account) wallet to the root key.
     *
     * @param args
     * @returns
     */
    public async sendLinkEOAToRootKeyOp(
        args: Parameters<SpaceDapp['walletLink']['linkWalletToRootKey']>,
    ) {
        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }
        const [signer, externalWalletSigner] = args

        const walletLink = await this.spaceDapp.walletLink
        const functionName = 'linkWalletToRootKey'

        const functionHashForPaymasterProxy = getFunctionSigHash(
            walletLink.getInterface(),
            functionName,
        )

        const callDataForLinkingWallet = await this.spaceDapp.walletLink.encodeLinkWalletToRootKey(
            signer,
            externalWalletSigner,
        )

        return this.sendUserOp({
            toAddress: this.spaceDapp.walletLink.address,
            callData: callDataForLinkingWallet,
            signer,
            spaceId: undefined,
            functionHashForPaymasterProxy,
        })
    }

    public async sendRemoveWalletLinkOp(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        args: Parameters<SpaceDapp['walletLink']['removeLink']>,
    ): Promise<TownsUserOpClientSendUserOperationResponse> {
        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }
        const [rootKeySigner, walletAddressToRemove] = args

        const walletLink = this.spaceDapp.walletLink

        const functionName = 'removeLink'

        const functionHashForPaymasterProxy = getFunctionSigHash(
            walletLink.getInterface(),
            functionName,
        )

        const callDataRemoveWalletLink = await walletLink.encodeRemoveLink(
            rootKeySigner,
            walletAddressToRemove,
        )

        return this.sendUserOp({
            toAddress: this.spaceDapp.walletLink.address,
            callData: callDataRemoveWalletLink,
            signer: rootKeySigner,
            spaceId: undefined,
            functionHashForPaymasterProxy,
        })
    }

    public async sendUpdateSpaceInfoOp(
        args: Parameters<SpaceDapp['updateSpaceInfo']>,
    ): Promise<TownsUserOpClientSendUserOperationResponse> {
        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }
        const [spaceId, spaceName, uri, shortDescription, longDescription, signer] = args
        const space = await this.spaceDapp.getSpace(spaceId)

        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }

        // the function name in the contract is updateSpaceInfo
        // in space dapp we update the space name only using updateSpaceInfo which calls updateSpaceInfo
        const functionName = 'updateSpaceInfo'

        const functionHashForPaymasterProxy = getFunctionSigHash(
            space.SpaceOwner.interface,
            functionName,
        )

        const spaceInfo = await space.getSpaceInfo()
        const callData = await space.SpaceOwner.encodeFunctionData(functionName, [
            space.Address,
            spaceName,
            uri ?? spaceInfo.uri ?? '',
            shortDescription ?? spaceInfo.shortDescription ?? '',
            longDescription ?? spaceInfo.longDescription ?? '',
        ])

        return this.sendUserOp({
            toAddress: space.SpaceOwner.address,
            callData: callData,
            spaceId: spaceId,
            signer,
            functionHashForPaymasterProxy,
        })
    }

    public async sendCreateChannelOp(
        args: Parameters<SpaceDapp['createChannelWithPermissionOverrides']>,
    ): Promise<TownsUserOpClientSendUserOperationResponse> {
        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }
        const [spaceId, channelName, channelDescription, channelNetworkId, roles, signer] = args
        const channelId = channelNetworkId.startsWith('0x')
            ? channelNetworkId
            : `0x${channelNetworkId}`

        const space = this.spaceDapp.getSpace(spaceId)

        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }

        const functionName = 'createChannelWithOverridePermissions'

        const functionHashForPaymasterProxy = getFunctionSigHash(
            space.Channels.interface,
            functionName,
        )
        const callData = space.Channels.encodeFunctionData(functionName, [
            channelId,
            stringifyChannelMetadataJSON({
                name: channelName,
                description: channelDescription,
            }),
            roles,
        ])

        return this.sendUserOp({
            toAddress: [space.Channels.address],
            callData: [callData],
            signer,
            spaceId: spaceId,
            functionHashForPaymasterProxy,
        })
    }

    public async sendUpdateChannelOp(
        args: Parameters<SpaceDapp['updateChannel']>,
    ): Promise<TownsUserOpClientSendUserOperationResponse> {
        const [params, signer] = args

        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }
        const space = this.spaceDapp.getSpace(params.spaceId)

        if (!space) {
            throw new Error(`Space with spaceId "${params.spaceId}" is not found.`)
        }

        const callData = await this.spaceDapp.encodedUpdateChannelData(space, params)

        const multiCallData = space.Multicall.encodeFunctionData('multicall', [callData])

        return this.sendUserOp({
            toAddress: [space.Multicall.address],
            callData: [multiCallData],
            signer,
            spaceId: params.spaceId,
            functionHashForPaymasterProxy: 'updateChannel',
        })
    }

    // no delete channel in spaceDapp
    public async sendDeleteChannelOp(): Promise<TownsUserOpClientSendUserOperationResponse> {
        throw new Error('Not implemented')
    }

    // add role to channel is not currently directly used in app
    public async sendAddRoleToChannelOp(): Promise<TownsUserOpClientSendUserOperationResponse> {
        throw new Error('Not implemented')
    }

    // remove role from channel is not currently directly used in app
    public async sendRemoveRoleFromChannelOp(): Promise<TownsUserOpClientSendUserOperationResponse> {
        throw new Error('Not implemented')
    }

    public async sendLegacyCreateRoleOp(
        args: Parameters<SpaceDapp['legacyCreateRole']>,
    ): Promise<TownsUserOpClientSendUserOperationResponse> {
        const [spaceId, roleName, permissions, users, ruleData, signer] = args

        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }
        const space = await this.spaceDapp.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }

        const functionName = 'createRole'

        const functionHashForPaymasterProxy = getFunctionSigHash(
            space.Roles.interface,
            functionName,
        )

        const entitlements = await createLegacyEntitlementStruct(space, users, ruleData)

        const callData = await space.Roles.encodeFunctionData(functionName, [
            roleName,
            permissions,
            entitlements,
        ])

        return this.sendUserOp({
            toAddress: [space.Roles.address],
            callData: [callData],
            signer,
            spaceId: spaceId,
            functionHashForPaymasterProxy,
        })
    }

    public async sendCreateRoleOp(
        args: Parameters<SpaceDapp['createRole']>,
    ): Promise<TownsUserOpClientSendUserOperationResponse> {
        const [spaceId, roleName, permissions, users, ruleData, signer] = args

        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }
        const space = await this.spaceDapp.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }

        const functionName = 'createRole'

        const functionHashForPaymasterProxy = getFunctionSigHash(
            space.Roles.interface,
            functionName,
        )

        const entitlements = await createEntitlementStruct(space, users, ruleData)

        const callData = await space.Roles.encodeFunctionData(functionName, [
            roleName,
            permissions,
            entitlements,
        ])

        return this.sendUserOp({
            toAddress: [space.Roles.address],
            callData: [callData],
            signer,
            spaceId: spaceId,
            functionHashForPaymasterProxy,
        })
    }

    public async sendDeleteRoleOp(
        args: Parameters<SpaceDapp['deleteRole']>,
    ): Promise<TownsUserOpClientSendUserOperationResponse> {
        const [spaceId, roleId, signer] = args

        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }
        const space = await this.spaceDapp.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        const functionName = 'removeRole'

        const functionHashForPaymasterProxy = getFunctionSigHash(
            space.Roles.interface,
            functionName,
        )

        const callData = await space.Roles.encodeFunctionData(functionName, [roleId])

        return this.sendUserOp({
            toAddress: [space.Roles.address],
            callData: [callData],
            signer,
            spaceId: spaceId,
            functionHashForPaymasterProxy,
        })
    }

    public async sendUpdateRoleOp(
        args: Parameters<SpaceDapp['updateRole']>,
    ): Promise<TownsUserOpClientSendUserOperationResponse> {
        const [updateRoleParams, signer] = args
        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }
        const space = this.spaceDapp.getSpace(updateRoleParams.spaceNetworkId)
        if (!space) {
            throw new Error(`Space with spaceId "${updateRoleParams.spaceNetworkId}" is not found.`)
        }
        const { functionHashForPaymasterProxy, callData } = await this.encodeUpdateRoleData({
            space,
            updateRoleParams,
        })

        return this.sendUserOp({
            toAddress: [space.Roles.address],
            callData: [callData],
            signer,
            spaceId: updateRoleParams.spaceNetworkId,
            functionHashForPaymasterProxy,
        })
    }

    public async sendSetChannelPermissionOverridesOp(
        args: Parameters<SpaceDapp['setChannelPermissionOverrides']>,
    ): Promise<TownsUserOpClientSendUserOperationResponse> {
        const [params, signer] = args

        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }

        const space = this.spaceDapp.getSpace(params.spaceNetworkId)

        if (!space) {
            throw new Error(`Space with spaceId "${params.spaceNetworkId}" is not found.`)
        }

        const { functionHashForPaymasterProxy, callData } =
            await this.encodeSetChannelRoleOverridesData({
                space,
                params,
            })

        return this.sendUserOp({
            toAddress: [space.Roles.address],
            callData: [callData],
            signer,
            spaceId: params.spaceNetworkId,
            functionHashForPaymasterProxy,
        })
    }

    public async sendClearChannelPermissionOverridesOp(
        args: Parameters<SpaceDapp['clearChannelPermissionOverrides']>,
    ): Promise<TownsUserOpClientSendUserOperationResponse> {
        const [params, signer] = args

        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }

        const space = this.spaceDapp.getSpace(params.spaceNetworkId)

        if (!space) {
            throw new Error(`Space with spaceId "${params.spaceNetworkId}" is not found.`)
        }

        const { functionHashForPaymasterProxy, callData } =
            await this.encodeClearChannelRoleOverridesData({
                space,
                params,
            })

        return this.sendUserOp({
            toAddress: [space.Roles.address],
            callData: [callData],
            signer,
            spaceId: params.spaceNetworkId,
            functionHashForPaymasterProxy,
        })
    }

    public async encodeLegacyUpdateRoleData({
        space,
        legacyUpdateRoleParams,
    }: {
        space: Space
        legacyUpdateRoleParams: LegacyUpdateRoleParams
    }) {
        const functionName = 'updateRole'

        const functionHashForPaymasterProxy = getFunctionSigHash(
            space.Roles.interface,
            functionName,
        )

        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }

        const updatedEntitlements = await createLegacyEntitlementStruct(
            space,
            legacyUpdateRoleParams.users,
            legacyUpdateRoleParams.ruleData,
        )

        const callData = await space.Roles.encodeFunctionData(functionName, [
            legacyUpdateRoleParams.roleId,
            legacyUpdateRoleParams.roleName,
            legacyUpdateRoleParams.permissions,
            updatedEntitlements,
        ])

        return { functionHashForPaymasterProxy, callData }
    }

    public async sendLegacyUpdateRoleOp(
        args: Parameters<SpaceDapp['legacyUpdateRole']>,
    ): Promise<TownsUserOpClientSendUserOperationResponse> {
        const [legacyUpdateRoleParams, signer] = args
        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }
        const space = this.spaceDapp.getSpace(legacyUpdateRoleParams.spaceNetworkId)
        if (!space) {
            throw new Error(
                `Space with spaceId "${legacyUpdateRoleParams.spaceNetworkId}" is not found.`,
            )
        }
        const { functionHashForPaymasterProxy, callData } = await this.encodeLegacyUpdateRoleData({
            space,
            legacyUpdateRoleParams,
        })

        return this.sendUserOp({
            toAddress: [space.Roles.address],
            callData: [callData],
            signer,
            spaceId: legacyUpdateRoleParams.spaceNetworkId,
            functionHashForPaymasterProxy,
        })
    }

    public async encodeUpdateRoleData({
        space,
        updateRoleParams,
    }: {
        space: Space
        updateRoleParams: UpdateRoleParams
    }) {
        const functionName = 'updateRole'

        const functionHashForPaymasterProxy = getFunctionSigHash(
            space.Roles.interface,
            functionName,
        )

        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }

        const updatedEntitlements = await this.spaceDapp.createUpdatedEntitlements(
            space,
            updateRoleParams,
        )

        const callData = await space.Roles.encodeFunctionData(functionName, [
            updateRoleParams.roleId,
            updateRoleParams.roleName,
            updateRoleParams.permissions,
            updatedEntitlements,
        ])

        return { functionHashForPaymasterProxy, callData }
    }

    public async encodeSetChannelRoleOverridesData({
        space,
        params,
    }: {
        space: Space
        params: SetChannelPermissionOverridesParams
    }) {
        const functionName = 'setChannelPermissionOverrides'

        const functionHashForPaymasterProxy = getFunctionSigHash(
            space.Roles.interface,
            functionName,
        )

        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }

        const callData = await space.Roles.encodeFunctionData(functionName, [
            params.roleId,
            params.channelId.startsWith('0x') ? params.channelId : `0x${params.channelId}`,
            params.permissions,
        ])

        return { functionHashForPaymasterProxy, callData }
    }

    public async encodeClearChannelRoleOverridesData({
        space,
        params,
    }: {
        space: Space
        params: ClearChannelPermissionOverridesParams
    }) {
        const functionName = 'clearChannelPermissionOverrides'

        const functionHashForPaymasterProxy = getFunctionSigHash(
            space.Roles.interface,
            functionName,
        )

        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }
        const callData = await space.Roles.encodeFunctionData(functionName, [
            params.roleId,
            params.channelId.startsWith('0x') ? params.channelId : `0x${params.channelId}`,
        ])

        return { functionHashForPaymasterProxy, callData }
    }

    public async sendBanWalletAddressOp(args: Parameters<SpaceDapp['banWalletAddress']>) {
        const [spaceId, walletAddress, signer] = args
        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }
        const space = await this.spaceDapp.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }

        const functionName = 'ban'
        const functionHashForPaymasterProxy = getFunctionSigHash(
            space.Banning.interface,
            functionName,
        )

        const tokenId = await space.ERC721AQueryable.read
            .tokensOfOwner(walletAddress)
            .then((tokens) => tokens[0])
        const callData = await space.Banning.encodeFunctionData(functionName, [tokenId])

        return this.sendUserOp({
            toAddress: [space.Banning.address],
            callData: [callData],
            signer,
            spaceId: spaceId,
            functionHashForPaymasterProxy,
        })
    }

    public async sendUnbanWalletAddressOp(args: Parameters<SpaceDapp['unbanWalletAddress']>) {
        const [spaceId, walletAddress, signer] = args
        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }
        const space = await this.spaceDapp.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }

        const functionName = 'unban'
        const functionHashForPaymasterProxy = getFunctionSigHash(
            space.Banning.interface,
            functionName,
        )

        const tokenId = await space.ERC721AQueryable.read
            .tokensOfOwner(walletAddress)
            .then((tokens) => tokens[0])
        const callData = await space.Banning.encodeFunctionData(functionName, [tokenId])
        return this.sendUserOp({
            toAddress: [space.Banning.address],
            callData: [callData],
            signer,
            spaceId: spaceId,
            functionHashForPaymasterProxy,
        })
    }

    public async getDetailsForEditingMembershipSettings(spaceId: string, space: Space) {
        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }
        const membershipInfo = await this.spaceDapp.getMembershipInfo(spaceId)

        const entitlementShims = await space.getEntitlementShims()
        if (!entitlementShims.length) {
            throw new Error('Rule entitlement not found')
        }

        // minter role = 1
        const roleEntitlements = await space.getRoleEntitlements(entitlementShims, 1)
        return {
            membershipInfo,
            freeAllocation: await space.Membership.read.getMembershipFreeAllocation(),
            roleEntitlements,
        }
    }

    public async sendEditMembershipSettingsOp(args: {
        spaceId: string
        updateRoleParams: UpdateRoleParams
        membershipParams: {
            pricingModule: string
            membershipPrice: ethers.BigNumberish // wei
            membershipSupply: ethers.BigNumberish
            freeAllocation?: ethers.BigNumberish
        }
        signer: ethers.Signer
    }) {
        const spaceId = args.spaceId
        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }
        const txs: {
            callData: string
            toAddress: string
        }[] = []

        const space = this.spaceDapp.getSpace(spaceId)

        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }

        const {
            pricingModule: newPricingModule,
            membershipPrice: newMembershipPrice,
            membershipSupply: newMembershipSupply,
            freeAllocation: freeAllocation,
        } = args.membershipParams
        const newFreeAllocation = freeAllocation ?? 0

        const newRuleData = args.updateRoleParams.ruleData

        const { membershipInfo, roleEntitlements } =
            await this.getDetailsForEditingMembershipSettings(spaceId, space)

        ///////////////////////////////////////////////////////////////////////////////////
        //// update minter role ///////////////////////////////////////////////////////////
        const entitlementShims = await space.getEntitlementShims()
        if (!entitlementShims.length) {
            throw new Error('Rule entitlement not found')
        }
        if (roleEntitlements?.ruleData.kind === 'v1') {
            throw new Error('Cannot use update role params on a legacy space')
        }

        if (!isEqual(newRuleData, roleEntitlements?.ruleData.rules)) {
            const roleData = await this.encodeUpdateRoleData({
                space,
                updateRoleParams: args.updateRoleParams,
            })

            txs.push({
                callData: roleData.callData,
                toAddress: space.Roles.address,
            })
        }

        ///////////////////////////////////////////////////////////////////////////////////
        //// update membership pricing ////////////////////////////////////////////////////
        // To change a "free" (paid w/ price = 0 + freeAllocation > 0) membership to a paid membership:
        // 1. freeAllocation must be 0
        // 2. membership price must be set
        //
        // Cannot change a paid space to a free space (contract reverts)

        const pricingModules = await this.spaceDapp.listPricingModules()
        const fixedPricingModule = findFixedPricingModule(pricingModules)
        const dynamicPricingModule = findDynamicPricingModule(pricingModules)
        const currentFreeAllocation = await space.Membership.read.getMembershipFreeAllocation()
        const { price: currentMembershipPrice } = await this.spaceDapp.getJoinSpacePriceDetails(
            spaceId,
        )

        if (!fixedPricingModule || !dynamicPricingModule) {
            throw new Error('Pricing modules not found')
        }

        const currentPricingModule = await space.Membership.read.getMembershipPricingModule()
        const currentIsFixedPricing =
            currentPricingModule.toLowerCase() ===
            fixedPricingModule.module.toString().toLowerCase()
        const newIsFixedPricing =
            newPricingModule.toLowerCase() === fixedPricingModule.module.toString().toLowerCase()
        const newMembershipPriceBigNumber = ethers.BigNumber.from(newMembershipPrice)

        // fixed price of 0 ("free") to fixed price of non-zero
        if (
            currentIsFixedPricing &&
            currentFreeAllocation.toBigInt() > 0n &&
            newIsFixedPricing &&
            newMembershipPriceBigNumber.gt(0) &&
            newFreeAllocation === 0
        ) {
            const freeAllocationCallData = space.Membership.encodeFunctionData(
                'setMembershipFreeAllocation',
                [newFreeAllocation],
            )
            txs.push({
                callData: freeAllocationCallData,
                toAddress: space.Membership.address,
            })

            const membershipPriceCallData = space.Membership.encodeFunctionData(
                'setMembershipPrice',
                [newMembershipPrice],
            )
            txs.push({
                callData: membershipPriceCallData,
                toAddress: space.Membership.address,
            })
        }
        // switching from fixed to dynamic space
        else if (currentIsFixedPricing && !newIsFixedPricing) {
            throw new CodeException({
                message: 'Cannot change a fixed pricing space to a dynamic pricing space',
                code: 'USER_OPS_CANNOT_CHANGE_TO_DYNAMIC_PRICING_SPACE',
                category: 'userop',
            })
        }
        // dynamic to dynamic
        else if (!currentIsFixedPricing && !newIsFixedPricing) {
            // do nothing
        }
        // price update only
        else if (!currentMembershipPrice.eq(newMembershipPriceBigNumber)) {
            const membershipPriceCallData = space.Membership.encodeFunctionData(
                'setMembershipPrice',
                [newMembershipPrice],
            )
            txs.push({
                callData: membershipPriceCallData,
                toAddress: space.Membership.address,
            })
        }

        ///////////////////////////////////////////////////////////////////////////////////
        //// update membership limit ////////////////////////////////////////////////////
        if (
            !ethers.BigNumber.from(membershipInfo.maxSupply).eq(
                ethers.BigNumber.from(newMembershipSupply),
            )
        ) {
            const callData = await space.Membership.encodeFunctionData('setMembershipLimit', [
                newMembershipSupply,
            ])
            txs.push({
                callData,
                toAddress: space.Membership.address,
            })
        }

        return this.sendUserOp({
            toAddress: txs.map((tx) => tx.toAddress),
            callData: txs.map((tx) => tx.callData),
            signer: args.signer,
            spaceId,
            functionHashForPaymasterProxy: 'editMembershipSettings',
        })
    }

    public async sendLegacyEditMembershipSettingsOp(args: {
        spaceId: string
        legacyUpdateRoleParams: LegacyUpdateRoleParams
        membershipParams: {
            pricingModule: string
            membershipPrice: ethers.BigNumberish // wei
            membershipSupply: ethers.BigNumberish
            freeAllocation?: ethers.BigNumberish
        }
        signer: ethers.Signer
    }) {
        const spaceId = args.spaceId
        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }
        const txs: {
            callData: string
            toAddress: string
        }[] = []

        const space = this.spaceDapp.getSpace(spaceId)

        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }

        const {
            pricingModule: newPricingModule,
            membershipPrice: newMembershipPrice,
            membershipSupply: newMembershipSupply,
            freeAllocation: freeAllocation,
        } = args.membershipParams
        const newFreeAllocation = freeAllocation ?? 1

        const newRuleData = args.legacyUpdateRoleParams.ruleData
        const newUsers = args.legacyUpdateRoleParams.users

        const { membershipInfo, roleEntitlements } =
            await this.getDetailsForEditingMembershipSettings(spaceId, space)

        ///////////////////////////////////////////////////////////////////////////////////
        //// update minter role ///////////////////////////////////////////////////////////
        const entitlementShims = await space.getEntitlementShims()
        if (!entitlementShims.length) {
            throw new Error('Rule entitlement not found')
        }
        if (roleEntitlements?.ruleData.kind === 'v2') {
            throw new Error('Cannot use legacy update role params on a v2 space')
        }

        // TODO: why did this require a change? Once upon a time, the returned rule
        // data had no extra fields, but now it does.
        const updatedRuleData = {
            operations: roleEntitlements?.ruleData.rules.operations,
            checkOperations: roleEntitlements?.ruleData.rules.checkOperations,
            logicalOperations: roleEntitlements?.ruleData.rules.logicalOperations,
        }
        if (!isEqual(newRuleData, updatedRuleData)) {
            const newRuleDataIsNoop = isEqual(newRuleData, NoopRuleData)

            if (newRuleDataIsNoop && !newUsers.includes(EVERYONE_ADDRESS)) {
                throw new CodeException({
                    message: 'Noop rule entitlement must be used with the everyone address',
                    code: 'USER_OPS_NOOP_REQUIRES_EVERYONE',
                    category: 'userop',
                })
            } else if (!newRuleDataIsNoop && newUsers.includes(EVERYONE_ADDRESS)) {
                throw new CodeException({
                    message: 'Rule entitlements cannot be used with the everyone address',
                    code: 'USER_OPS_RULES_CANNOT_BE_USED_WITH_EVERYONE',
                    category: 'userop',
                })
            }

            const roleData = await this.encodeLegacyUpdateRoleData({
                space,
                legacyUpdateRoleParams: args.legacyUpdateRoleParams,
            })

            txs.push({
                callData: roleData.callData,
                toAddress: space.Roles.address,
            })
        }

        ///////////////////////////////////////////////////////////////////////////////////
        //// update membership pricing ////////////////////////////////////////////////////
        // To change a free membership to a paid membership:
        // 1. pricing module must be changed to a non-fixed pricing module
        // 2. freeAllocation must be > 0 (contract reverts otherwise). If set to 1 (recommended), the first membership on the paid space will be free
        // 3. membership price must be set
        //
        // Cannot change a paid space to a free space (contract reverts)

        const pricingModules = await this.spaceDapp.listPricingModules()
        const fixedPricingModule = findFixedPricingModule(pricingModules)
        const dynamicPricingModule = findDynamicPricingModule(pricingModules)
        const currentFreeAllocation = await space.Membership.read.getMembershipFreeAllocation()
        const { price: currentMembershipPrice } = await this.spaceDapp.getJoinSpacePriceDetails(
            spaceId,
        )

        if (!fixedPricingModule || !dynamicPricingModule) {
            throw new Error('Pricing modules not found')
        }

        const currentPricingModule = await space.Membership.read.getMembershipPricingModule()
        const currentIsFixedPricing =
            currentPricingModule.toLowerCase() ===
            fixedPricingModule.module.toString().toLowerCase()
        const newIsFixedPricing =
            newPricingModule.toLowerCase() === fixedPricingModule.module.toString().toLowerCase()
        const newMembershipPriceBigNumber = ethers.BigNumber.from(newMembershipPrice)

        // fixed price of 0 ("free") to fixed price of non-zero
        if (
            currentIsFixedPricing &&
            currentFreeAllocation.toBigInt() > 0n &&
            newIsFixedPricing &&
            newMembershipPriceBigNumber.gt(0) &&
            newFreeAllocation === 0
        ) {
            const freeAllocationCallData = space.Membership.encodeFunctionData(
                'setMembershipFreeAllocation',
                [newFreeAllocation],
            )
            txs.push({
                callData: freeAllocationCallData,
                toAddress: space.Membership.address,
            })

            const membershipPriceCallData = space.Membership.encodeFunctionData(
                'setMembershipPrice',
                [newMembershipPrice],
            )
            txs.push({
                callData: membershipPriceCallData,
                toAddress: space.Membership.address,
            })
        }
        // switching from fixed to dynamic space
        else if (currentIsFixedPricing && !newIsFixedPricing) {
            throw new CodeException({
                message: 'Cannot change a fixed pricing space to a dynamic pricing space',
                code: 'USER_OPS_CANNOT_CHANGE_TO_DYNAMIC_PRICING_SPACE',
                category: 'userop',
            })
        }
        // dynamic to dynamic
        else if (!currentIsFixedPricing && !newIsFixedPricing) {
            // do nothing
        }
        // price update only
        else if (!currentMembershipPrice.eq(newMembershipPriceBigNumber)) {
            const membershipPriceCallData = space.Membership.encodeFunctionData(
                'setMembershipPrice',
                [newMembershipPrice],
            )
            txs.push({
                callData: membershipPriceCallData,
                toAddress: space.Membership.address,
            })
        }

        ///////////////////////////////////////////////////////////////////////////////////
        //// update membership limit ////////////////////////////////////////////////////
        if (
            !ethers.BigNumber.from(membershipInfo.maxSupply).eq(
                ethers.BigNumber.from(newMembershipSupply),
            )
        ) {
            const callData = await space.Membership.encodeFunctionData('setMembershipLimit', [
                newMembershipSupply,
            ])
            txs.push({
                callData,
                toAddress: space.Membership.address,
            })
        }

        return this.sendUserOp({
            toAddress: txs.map((tx) => tx.toAddress),
            callData: txs.map((tx) => tx.callData),
            signer: args.signer,
            spaceId,
            functionHashForPaymasterProxy: 'editMembershipSettings',
        })
    }

    public async sendPrepayMembershipOp(args: Parameters<SpaceDapp['prepayMembership']>) {
        const [spaceId, prepaidSupply, signer] = args

        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }
        const space = this.spaceDapp.getSpace(spaceId)

        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }

        const cost = await space.Prepay.read.calculateMembershipPrepayFee(prepaidSupply)
        const callData = space.Prepay.encodeFunctionData('prepayMembership', [prepaidSupply])
        return this.sendUserOp({
            toAddress: space.Prepay.address,
            callData,
            signer,
            spaceId,
            value: cost,
            functionHashForPaymasterProxy: 'prepayMembership',
        })
    }

    public async sendTransferEthOp(
        transferData: {
            recipient: string
            value: ethers.BigNumberish
        },
        signer: ethers.Signer,
    ) {
        const { recipient, value } = transferData

        const aaAddress = await this.getAbstractAccountAddress({
            rootKeyAddress: (await signer.getAddress()) as Address,
        })

        if (!aaAddress) {
            throw new Error('Failed to get AA address')
        }

        return this.sendUserOp({
            toAddress: recipient,
            callData: '0x',
            functionHashForPaymasterProxy: 'transferEth',
            signer,
            spaceId: undefined,
            value,
        })
    }

    public async sendWithdrawSpaceFundsOp(args: Parameters<SpaceDapp['withdrawSpaceFunds']>) {
        const [spaceId, recipient, signer] = args
        const space = this.spaceDapp?.getSpace(spaceId)

        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }

        const callData = space.Membership.encodeFunctionData('withdraw', [recipient])

        return this.sendUserOp({
            toAddress: space.Membership.address,
            callData,
            functionHashForPaymasterProxy: 'withdraw',
            signer,
            spaceId: undefined,
        })
    }

    public async sendTransferAssetsOp(
        transferData: {
            contractAddress: string
            recipient: string
            tokenId: string
            quantity?: number
        },
        signer: ethers.Signer,
    ) {
        const { recipient, contractAddress, tokenId, quantity } = transferData
        const fromAddress = await this.getAbstractAccountAddress({
            rootKeyAddress: (await signer.getAddress()) as Address,
        })
        if (!fromAddress) {
            throw new Error('Failed to get from address')
        }

        const callData = await getTransferCallData({
            recipient,
            tokenId,
            fromAddress,
            contractAddress,
            provider: (await this.getBuilder({ signer })).provider,
            quantity,
        })
        return this.sendUserOp({
            toAddress: contractAddress,
            callData,
            signer,
            spaceId: undefined,
            functionHashForPaymasterProxy: 'transferTokens',
        })
    }

    public async refreshMetadata(args: Parameters<SpaceDapp['refreshMetadata']>) {
        const [spaceId, signer] = args
        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }
        const space = this.spaceDapp.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        const callData = space.Membership.metadata.encodeFunctionData('refreshMetadata', [])

        return this.sendUserOp({
            toAddress: space.Address,
            callData,
            signer,
            spaceId,
            functionHashForPaymasterProxy: 'refreshMetadata',
        })
    }

    public async sendTipOp(args: Parameters<SpaceDapp['tip']>) {
        const [{ spaceId, tokenId, currency, amount, messageId, channelId }, signer] = args
        const space = this.spaceDapp?.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }

        const callData = space.Tipping.encodeFunctionData('tip', [
            {
                tokenId,
                currency,
                amount,
                messageId,
                channelId,
            },
        ])

        return this.sendUserOp({
            toAddress: space.Address,
            callData,
            signer,
            spaceId,
            value: amount,
            functionHashForPaymasterProxy: 'tip',
        })
    }

    public async sendCheckInOp(args: Parameters<SpaceDapp['airdrop']['checkIn']>) {
        const [signer] = args

        const riverPoints = this.spaceDapp?.airdrop?.riverPoints

        if (!riverPoints?.address) {
            throw new Error('riverPoints is required')
        }

        const callData = riverPoints.encodeFunctionData('checkIn', [])

        return this.sendUserOp({
            toAddress: riverPoints.address,
            spaceId: undefined,
            callData,
            signer,
            functionHashForPaymasterProxy: 'checkIn',
        })
    }

    public async getBuilder(args: { signer: ethers.Signer }) {
        if (!this.builder) {
            const { signer } = args
            this.builder = TownsSimpleAccount.init(signer, this.aaRpcUrl, {
                entryPoint: this.entryPointAddress,
                factory: this.factoryAddress,
                overrideBundlerRpc: this.bundlerUrl,
                // salt?: BigNumberish;
                // nonceKey?: number;
            })
        }
        return this.builder
    }

    private async addMiddleware({
        builder,
        signer,
    }: {
        builder: TownsSimpleAccount
        signer: ethers.Signer
    }) {
        if (this.middlewareInitialized) {
            return
        }
        this.middlewareInitialized = true
        const timeTracker = this.timeTracker

        // stackup bundler (local dev)
        // stackup paymaster requires gas fee estimates to be included in the user operation
        // alchemy bundler does not require gas fee estimates b/c we are using alchemy_requestGasAndPaymasterAndData in the paymaster proxy server
        // https://docs.alchemy.com/reference/alchemy-requestgasandpaymasteranddata
        builder
            .useMiddleware(async (ctx) => {
                if (!isUsingAlchemyBundler(this.bundlerUrl)) {
                    return getEthMaxPriorityFeePerGas(builder.provider)(ctx)
                }
            })
            // pass user op with new gas data to paymaster.
            // If approved, paymaster returns preverification gas and we assign it to the user operation.
            // The userop fields can no longer be manipulated or else the paymaster sig will be invalid
            //
            // If rejected, gas must be estimated in later middleware
            .useMiddleware(async (ctx) => {
                if (this.paymasterProxyUrl && this.paymasterProxyAuthSecret) {
                    const { sequenceName, functionHashForPaymasterProxy, spaceId, txValue } =
                        this.middlewareVars

                    if (txValue && ethers.BigNumber.from(txValue).gt(0)) {
                        return
                    }
                    if (this.middlewareVars.functionHashForPaymasterProxy === 'checkIn') {
                        return
                    }

                    let endPaymasterMiddleware: (() => void) | undefined

                    if (sequenceName) {
                        endPaymasterMiddleware = timeTracker?.startMeasurement(
                            sequenceName,
                            `userops_${functionHashForPaymasterProxy}_paymasterProxyMiddleware`,
                        )
                    }
                    await paymasterProxyMiddleware({
                        rootKeyAddress: await signer.getAddress(),
                        userOpContext: ctx,
                        paymasterProxyAuthSecret: this.paymasterProxyAuthSecret,
                        paymasterProxyUrl: this.paymasterProxyUrl,
                        functionHashForPaymasterProxy: functionHashForPaymasterProxy,
                        spaceId,
                        bundlerUrl: this.bundlerUrl,
                        fetchAccessTokenFn: this.fetchAccessTokenFn,
                    })

                    endPaymasterMiddleware?.()
                }
            })
            .useMiddleware(async (ctx) => {
                if (isUsingAlchemyBundler(this.bundlerUrl)) {
                    if (isSponsoredOp(ctx)) {
                        return
                    }
                    return estimateAlchemyGasFees(ctx, builder.provider)
                }
            })
            .useMiddleware(async (ctx) => {
                const { spaceId } = this.middlewareVars
                if (isSponsoredOp(ctx)) {
                    return
                }
                return estimateGasLimit({
                    ctx,
                    provider: builder.provider,
                    bundlerUrl: this.bundlerUrl,
                    spaceId,
                    spaceDapp: this.spaceDapp,
                    functionHashForPaymasterProxy:
                        this.middlewareVars.functionHashForPaymasterProxy,
                })
            })
            .useMiddleware(async (ctx) => {
                const { functionHashForPaymasterProxy, txValue, spaceId } = this.middlewareVars
                const space = spaceId ? this.spaceDapp?.getSpace(spaceId) : undefined
                return saveOpToUserOpsStore(
                    ctx,
                    functionHashForPaymasterProxy,
                    txValue,
                    builder,
                    space,
                )
            })
            // prompt user if the paymaster rejected
            .useMiddleware(async (ctx) => {
                if (this.skipPromptUserOnPMRejectedOp || isSponsoredOp(ctx)) {
                    return
                }
                const { functionHashForPaymasterProxy, txValue } = this.middlewareVars

                // tip is a special case
                // - it is not sponsored
                // - it will make tx without prompting user
                // - we only want to prompt user if not enough balance in sender wallet
                if (functionHashForPaymasterProxy === 'tip') {
                    const op = ctx.op
                    const totalCost = totalCostOfUserOp({
                        gasLimit: op.callGasLimit,
                        preVerificationGas: op.preVerificationGas,
                        verificationGasLimit: op.verificationGasLimit,
                        gasPrice: op.maxFeePerGas,
                        value: txValue,
                    })
                    const balance = await balanceOf(op.sender, builder.provider)

                    if (balance.lt(totalCost)) {
                        await promptUser()
                    }
                } else {
                    await promptUser()
                }
            })
            .useMiddleware(async (ctx) => {
                const { txValue, functionHashForPaymasterProxy } = this.middlewareVars
                if (!txValue || !functionHashForPaymasterProxy) {
                    return
                }

                return subtractGasFromMaxValue(ctx, signer, {
                    functionHash: functionHashForPaymasterProxy,
                    builder,
                    value: txValue,
                })
            })
            .useMiddleware(async (ctx) => signUserOpHash(ctx, signer))
    }

    /**
     * Collectively these calls can take > 1s
     * So optionally you can call this method to prep the builder and userOpClient prior to sending the first user operation
     */
    public setup(signer: ethers.Signer) {
        return Promise.all([this.getBuilder({ signer }), this.getUserOpClient()])
    }

    public reset() {
        this.builder = undefined
        this.userOpClient = undefined
        this.middlewareInitialized = false
        this.middlewareVars = new MiddlewareVars({
            operationAttempt: 1,
        })
        this.clearStore()
    }
}

async function getSignerAddress(signer: ethers.Signer): Promise<Address> {
    const address = await signer.getAddress()
    return address as Address
}
