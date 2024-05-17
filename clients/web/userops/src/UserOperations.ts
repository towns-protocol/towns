import {
    Address,
    ISpaceDapp,
    IArchitectBase,
    SpaceDapp,
    createEntitlementStruct,
    UpdateRoleParams,
    Space,
    findDynamicPricingModule,
    findFixedPricingModule,
    NoopRuleData,
} from '@river-build/web3'
import { ethers } from 'ethers'
import isEqual from 'lodash/isEqual'
import { ISendUserOperationResponse, Client as UseropClient, Presets } from 'userop'
import { UserOpsConfig, UserOpParams, FunctionHash } from './types'
import { userOpsStore } from './userOpsStore'
// TODO: we can probably add these via @account-abrstraction/contracts if preferred
import { EntryPoint__factory, SimpleAccountFactory__factory } from 'userop/dist/typechain'
import { ERC4337 } from 'userop/dist/constants'
import { CodeException, errorToCodeException, isPreverificationGasTooLowError } from './errors'
import { UserOperationEventEvent } from 'userop/dist/typechain/EntryPoint'
import { EVERYONE_ADDRESS } from './utils'
import { preverificationGasMultiplier, promptUser, signUserOpHash } from './middlewares'
import { paymasterProxyMiddleware } from './paymasterProxyMiddleware'

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
    private userOpClient: UseropClient | undefined
    protected spaceDapp: ISpaceDapp | undefined

    constructor(config: UserOpsConfig & { spaceDapp: ISpaceDapp }) {
        this.bundlerUrl = config.bundlerUrl ?? ''
        this.aaRpcUrl = config.aaRpcUrl
        this.paymasterProxyUrl = config.paymasterProxyUrl
        this.entryPointAddress = config.entryPointAddress ?? ERC4337.EntryPoint
        this.factoryAddress = config.factoryAddress ?? ERC4337.SimpleAccount.Factory
        this.paymasterProxyAuthSecret = config.paymasterProxyAuthSecret
        this.spaceDapp = config.spaceDapp
        this.skipPromptUserOnPMRejectedOp = config.skipPromptUserOnPMRejectedOp
    }

    public async getAbstractAccountAddress({
        rootKeyAddress,
    }: {
        rootKeyAddress: Address
    }): Promise<Address | undefined> {
        // copied from userop.js
        // easier b/c we don't need the signer, which we don't store
        //
        // alternative to this is calling Presets.Builder.SimpleAccount.init with signer, no paymaster required,
        // which can then call getSenderAddress
        try {
            if (!this.factoryAddress) {
                throw new Error('factoryAddress is required')
            }
            if (!this.entryPointAddress) {
                throw new Error('entryPointAddress is required')
            }
            if (!this.spaceDapp?.provider) {
                throw new Error('spaceDapp is required')
            }

            const initCode = await ethers.utils.hexConcat([
                this.factoryAddress,
                SimpleAccountFactory__factory.createInterface().encodeFunctionData(
                    'createAccount',
                    [
                        rootKeyAddress,
                        // ! salt must match whatever is used in initBuilder. If none, use 0, its the default for userop
                        ethers.BigNumber.from(0),
                    ],
                ),
            ])
            const entryPoint = EntryPoint__factory.connect(
                this.entryPointAddress,
                this.spaceDapp.provider,
            )

            await entryPoint.callStatic.getSenderAddress(initCode)
        } catch (error) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const address = error?.errorArgs?.sender
            if (!address) {
                throw error
            }

            userOpsStore.setState({ smartAccountAddress: address })
            return address as Address
        }
    }

    public async getUserOpClient() {
        if (!this.userOpClient) {
            this.userOpClient = await UseropClient.init(this.aaRpcUrl, {
                entryPoint: this.entryPointAddress,
                overrideBundlerRpc: this.bundlerUrl,
            })
            // update the userop.wait() timeout and interval
            // .wait() will poll the entrypoint every 500 ms for 30 seconds to see if the user operation was sent
            this.userOpClient.waitTimeoutMs = 30_000
            this.userOpClient.waitIntervalMs = 500
        }
        return this.userOpClient
    }

    public async sendUserOp(
        args: UserOpParams & {
            // a function signature hash to pass to paymaster proxy - this is just the function name for now
            functionHashForPaymasterProxy: string
            spaceId: string | undefined
            retryCount?: number
        },
    ): Promise<ISendUserOperationResponse> {
        const { toAddress, callData, value } = args

        const builder = await this.initBuilder(args)

        if (!toAddress) {
            throw new Error('toAddress is required')
        }
        if (!callData) {
            throw new Error('callData is required')
        }

        let userOp: Presets.Builder.SimpleAccount
        if (Array.isArray(toAddress)) {
            if (!Array.isArray(callData)) {
                throw new Error('callData must be an array if toAddress is an array')
            }
            if (toAddress.length !== callData.length) {
                throw new Error('toAddress and callData must be the same length')
            }
            userOp = builder.executeBatch(toAddress, callData)
        } else {
            if (Array.isArray(callData)) {
                throw new Error('callData must be a string if toAddress is a string')
            }
            userOp = builder.execute(toAddress, value ?? 0, callData)
        }

        const userOpClient = await this.getUserOpClient()

        // We get back preverification gas too low errors sometimes
        // - for pm sponsored ops, pretty much all we can do is retry. The paymaster is going to do its own esitamtes and provide a sig. We can't change it or the sig will be invalid
        // - for non-pm sponsored ops, we can up the preverification gas and retry
        let preverificationGasMultiplierValue = 1

        // 1 - estimate preverification gas. don't think this has any impact on paymaster's gas estimation, but we can pass it along just in case it does
        userOp.useMiddleware(async (ctx) =>
            preverificationGasMultiplier(preverificationGasMultiplierValue)(ctx),
        )
        // 2 - pass user op with new gas data to paymaster.
        // Unclear if pm_sponsorUserOperation called in paymaster uses any incoming estimate when estimating sponsored gas
        // paymaster returns preverification gas and we assign it to the user operation.
        // The userop fields can no longer be manipulated or else the paymaster sig will be invalid
        if (this.paymasterProxyUrl && this.paymasterProxyAuthSecret) {
            userOp.useMiddleware(async (ctx) =>
                paymasterProxyMiddleware({
                    rootKeyAddress: await args.signer.getAddress(),
                    userOpContext: ctx,
                    paymasterProxyAuthSecret: this.paymasterProxyAuthSecret,
                    paymasterProxyUrl: this.paymasterProxyUrl,
                    functionHashForPaymasterProxy: args.functionHashForPaymasterProxy,
                    townId: args.spaceId, // can or should i rename this to space id?
                }),
            )
        }

        // 3 - prompt user if the paymaster rejected. recalculate preverification gas
        if (!this.skipPromptUserOnPMRejectedOp) {
            userOp.useMiddleware(async (ctx) =>
                promptUser(preverificationGasMultiplierValue)(ctx, {
                    provider: this.spaceDapp?.provider,
                    config: this.spaceDapp?.config,
                    rpcUrl: this.aaRpcUrl,
                    bundlerUrl: this.bundlerUrl,
                    townId: args.spaceId,
                }),
            )
        }

        // 4 - sign the user operation
        userOp.useMiddleware(async (ctx) => signUserOpHash(ctx, args.signer))

        async function sendUserOperationWithRetry() {
            let attempt = 0
            let shouldTry = true
            let _error: CodeException | undefined = undefined
            while (shouldTry && attempt < (args.retryCount ?? 3)) {
                try {
                    const res = await userOpClient.sendUserOperation(userOp, {
                        onBuild: (op) => {
                            console.log('[UserOperations] Signed UserOperation:', op)
                        },
                    })
                    console.log('[UserOperations] userOpHash:', res.userOpHash)
                    return res
                } catch (error) {
                    _error = errorToCodeException(error)
                    // so far observed bundler errors for both paid and free ops seem to be b/c of preverification gas
                    // may need to handle additional errors in the future
                    // for now, only retrying the known preverification gas error
                    // https://docs.stackup.sh/docs/bundler-errors
                    if (isPreverificationGasTooLowError(error)) {
                        preverificationGasMultiplierValue++
                        await new Promise((resolve) => setTimeout(resolve, 500))
                        // this is a paid op. just retry until the user dismisses
                        if (userOp.getPaymasterAndData() === '0x') {
                            continue
                        }

                        attempt++
                        continue
                    } else {
                        shouldTry = false
                    }
                }
            }
            throw _error
        }

        return sendUserOperationWithRetry()
    }

    public async sendCreateSpaceOp(
        args: Parameters<SpaceDapp['createSpace']>,
        performanceCallbacks?: {
            getAbstractAccount: {
                start: () => void
                end: () => void
            }
            checkIfLinked: {
                start: () => void
                end: () => void
            }
            sendUserOp: {
                start: () => void
                end: () => void
            }
        },
    ): Promise<ISendUserOperationResponse> {
        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }
        const [createSpaceParams, signer] = args

        const spaceInfo: IArchitectBase.SpaceInfoStruct = {
            name: createSpaceParams.spaceName,
            uri: createSpaceParams.spaceMetadata,
            membership: createSpaceParams.membership,
            channel: {
                metadata: createSpaceParams.channelName || '',
            },
        }

        performanceCallbacks?.getAbstractAccount.start()
        const abstractAccountAddress = await this.getAbstractAccountAddress({
            rootKeyAddress: await getSignerAddress(signer),
        })
        performanceCallbacks?.getAbstractAccount.end()

        if (!abstractAccountAddress) {
            throw new Error('abstractAccountAddress is required')
        }

        const createSpaceFnName = 'createSpace'

        const callDataCreateSpace = this.spaceDapp.spaceRegistrar.SpaceArchitect.encodeFunctionData(
            createSpaceFnName,
            [spaceInfo],
        )

        performanceCallbacks?.checkIfLinked.start()
        if (await this.spaceDapp.walletLink.checkIfLinked(signer, abstractAccountAddress)) {
            performanceCallbacks?.checkIfLinked.end()

            const functionHashForPaymasterProxy = this.getFunctionSigHash(
                this.spaceDapp.spaceRegistrar.SpaceArchitect.interface,
                createSpaceFnName,
            )

            performanceCallbacks?.sendUserOp.start()
            const op = await this.sendUserOp({
                toAddress: this.spaceDapp.spaceRegistrar.SpaceArchitect.address,
                callData: callDataCreateSpace,
                signer,
                spaceId: undefined,
                functionHashForPaymasterProxy,
            })
            performanceCallbacks?.sendUserOp.end()
            return op
        }
        performanceCallbacks?.checkIfLinked.end()

        // wallet isn't linked, create a user op that both links and creates the space
        const functionName = 'createSpace_linkWallet'

        // TODO: this needs to accept an array of names/interfaces
        const functionHashForPaymasterProxy = this.getFunctionSigHash(
            this.spaceDapp.spaceRegistrar.SpaceArchitect.interface,
            functionName,
        )

        const callDataForLinkingSmartAccount = await this.encodeDataForLinkingSmartAccount(signer)

        performanceCallbacks?.sendUserOp.start()
        const op = await this.sendUserOp({
            toAddress: [
                this.spaceDapp.walletLink.address,
                this.spaceDapp.spaceRegistrar.SpaceArchitect.address,
            ],
            callData: [callDataForLinkingSmartAccount, callDataCreateSpace],
            signer,
            spaceId: undefined,
            functionHashForPaymasterProxy,
        })
        performanceCallbacks?.sendUserOp.end()
        return op
    }

    private async encodeDataForLinkingSmartAccount(rootKeySigner: ethers.Signer) {
        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }

        const abstractAccountAddress = await this.getAbstractAccountAddress({
            rootKeyAddress: await getSignerAddress(rootKeySigner),
        })

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
    ): Promise<ISendUserOperationResponse> {
        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }
        const [spaceId, recipient, signer] = args
        const space = await this.spaceDapp.getSpace(spaceId)

        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }

        const abstractAccountAddress = await this.getAbstractAccountAddress({
            rootKeyAddress: await getSignerAddress(signer),
        })
        if (!abstractAccountAddress) {
            throw new Error('abstractAccountAddress is required')
        }

        const membershipPrice = await space.Membership.read.getMembershipPrice()
        const callDataJoinSpace = space.Membership.encodeFunctionData('joinSpace', [recipient])

        if (await this.spaceDapp.walletLink.checkIfLinked(signer, abstractAccountAddress)) {
            // they already have a linked wallet, just join the space
            const functionName = 'joinSpace'

            const functionHashForPaymasterProxy = this.getFunctionSigHash(
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

            return this.sendUserOp({
                toAddress: space.Address,
                callData: callDataJoinSpace,
                value: membershipPrice,
                signer,
                spaceId: space.SpaceId,
                functionHashForPaymasterProxy,
            })
        }

        // if the user does not have a linked wallet, we need to link their smart account first b/c that is where the memberhship NFT will be minted
        // joinSpace might require a value, if the space has a fixed membership cost
        //
        // But SimpleAccount does not support executeBatch with values
        // A new user who is joining a paid space will encounter this scenario
        //
        // Therefore, we need to link the wallet first, then join the space
        // Another smart account contract should support this and allow for a single user operation
        const linkWalletUserOp = await this.sendLinkSmartAccountToRootKeyOp(signer)

        let userOpEventWalletLink: UserOperationEventEvent | null
        try {
            userOpEventWalletLink = await linkWalletUserOp.wait()
            if (!userOpEventWalletLink?.args.success) {
                throw new CodeException(
                    'Failed to perform user operation for linking wallet',
                    'USER_OPS_FAILED_TO_PERFORM_USER_OPERATION_LINK_WALLET',
                )
            }
        } catch (error) {
            throw new CodeException(
                'Failed to perform user operation for linking wallet',
                'USER_OPS_FAILED_TO_PERFORM_USER_OPERATION_LINK_WALLET',
                error,
            )
        }

        try {
            const linkWalletReceipt = await this.spaceDapp.provider?.waitForTransaction(
                userOpEventWalletLink.transactionHash,
            )
            if (linkWalletReceipt?.status !== 1) {
                throw new CodeException('Failed to link wallet', 'USER_OPS_FAILED_TO_LINK_WALLET')
            }
        } catch (error) {
            throw new CodeException(
                'Failed to link wallet',
                'USER_OPS_FAILED_TO_LINK_WALLET',
                error,
            )
        }

        return this.sendUserOp({
            toAddress: space.Address,
            value: membershipPrice,
            callData: callDataJoinSpace,
            signer,
            spaceId: space.SpaceId,
            functionHashForPaymasterProxy: 'joinSpace',
        })
    }

    /**
     * User operation to link smart account wallet to the root key.
     * @param args
     */
    public async sendLinkSmartAccountToRootKeyOp(
        rootKeySigner: ethers.Signer,
    ): Promise<ISendUserOperationResponse> {
        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }
        const signer = rootKeySigner
        const walletLink = await this.spaceDapp.walletLink
        const functionName = 'linkCallerToRootKey'

        const functionHashForPaymasterProxy = this.getFunctionSigHash(
            walletLink.getInterface(),
            functionName,
        )

        const callDataForLinkingSmartAccount = await this.encodeDataForLinkingSmartAccount(signer)

        return this.sendUserOp({
            toAddress: this.spaceDapp.walletLink.address,
            callData: callDataForLinkingSmartAccount,
            signer,
            spaceId: undefined,
            functionHashForPaymasterProxy,
        })
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

        const functionHashForPaymasterProxy = this.getFunctionSigHash(
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
    ): Promise<ISendUserOperationResponse> {
        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }
        const [rootKeySigner, walletAddressToRemove] = args

        const walletLink = this.spaceDapp.walletLink

        const functionName = 'removeLink'

        const functionHashForPaymasterProxy = this.getFunctionSigHash(
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

    public async sendUpdateSpaceNameOp(
        args: Parameters<SpaceDapp['updateSpaceName']>,
    ): Promise<ISendUserOperationResponse> {
        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }
        const [spaceId, spaceName, signer] = args
        const space = await this.spaceDapp.getSpace(spaceId)

        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        const spaceInfo = await space.getSpaceInfo()

        // the function name in the contract is updateSpaceInfo
        // in space dapp we update the space name only using updateSpaceName which calls updateSpaceInfo
        const functionName = 'updateSpaceInfo'

        const functionHashForPaymasterProxy = this.getFunctionSigHash(
            space.SpaceOwner.interface,
            functionName,
        )

        const callData = await space.SpaceOwner.encodeFunctionData(functionName, [
            space.Address,
            spaceName,
            spaceInfo.uri,
        ])

        return this.sendUserOp({
            toAddress: space.SpaceOwner.address,
            callData: callData,
            signer,
            spaceId: spaceId,
            functionHashForPaymasterProxy,
        })
    }

    public async sendCreateChannelOp(
        args: Parameters<SpaceDapp['createChannel']>,
    ): Promise<ISendUserOperationResponse> {
        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }
        const [spaceId, channelName, channelNetworkId, roleIds, signer] = args
        const channelId = channelNetworkId.startsWith('0x')
            ? channelNetworkId
            : `0x${channelNetworkId}`

        const space = await this.spaceDapp.getSpace(spaceId)

        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }

        const functionName = 'createChannel'

        const functionHashForPaymasterProxy = this.getFunctionSigHash(
            space.Channels.interface,
            functionName,
        )

        const callData = await space.Channels.encodeFunctionData(functionName, [
            channelId,
            channelName,
            roleIds,
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
    ): Promise<ISendUserOperationResponse> {
        const [params, signer] = args

        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }
        const space = await this.spaceDapp.getSpace(params.spaceId)

        if (!space) {
            throw new Error(`Space with spaceId "${params.spaceId}" is not found.`)
        }

        const callData = await this.spaceDapp.encodedUpdateChannelData(space, params)

        const multiCallData = await space.Multicall.encodeFunctionData('multicall', [callData])

        return this.sendUserOp({
            toAddress: [space.Multicall.address],
            callData: [multiCallData],
            signer,
            spaceId: params.spaceId,
            functionHashForPaymasterProxy: 'updateChannel',
        })
    }

    // no delete channel in spaceDapp
    public async sendDeleteChannelOp(): Promise<ISendUserOperationResponse> {
        throw new Error('Not implemented')
    }

    // add role to channel is not currently directly used in app
    public async sendAddRoleToChannelOp(): Promise<ISendUserOperationResponse> {
        throw new Error('Not implemented')
    }

    // remove role from channel is not currently directly used in app
    public async sendRemoveRoleFromChannelOp(): Promise<ISendUserOperationResponse> {
        throw new Error('Not implemented')
    }

    public async sendCreateRoleOp(
        args: Parameters<SpaceDapp['createRole']>,
    ): Promise<ISendUserOperationResponse> {
        const [spaceId, roleName, permissions, tokens, users, signer] = args

        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }
        const space = await this.spaceDapp.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }

        const functionName = 'createRole'

        const functionHashForPaymasterProxy = this.getFunctionSigHash(
            space.Roles.interface,
            functionName,
        )

        const entitlements = await createEntitlementStruct(space, tokens, users)

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
    ): Promise<ISendUserOperationResponse> {
        const [spaceId, roleId, signer] = args

        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }
        const space = await this.spaceDapp.getSpace(spaceId)
        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }
        const functionName = 'removeRole'

        const functionHashForPaymasterProxy = this.getFunctionSigHash(
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
    ): Promise<ISendUserOperationResponse> {
        const [updateRoleParams, signer] = args
        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }
        const space = await this.spaceDapp.getSpace(updateRoleParams.spaceNetworkId)
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

    public async encodeUpdateRoleData({
        space,
        updateRoleParams,
    }: {
        space: Space
        updateRoleParams: UpdateRoleParams
    }) {
        const functionName = 'updateRole'

        const functionHashForPaymasterProxy = this.getFunctionSigHash(
            space.Roles.interface,
            functionName,
        )

        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }

        const updatedEntitlemets = await this.spaceDapp.createUpdatedEntitlements(
            space,
            updateRoleParams,
        )

        const callData = await space.Roles.encodeFunctionData(functionName, [
            updateRoleParams.roleId,
            updateRoleParams.roleName,
            updateRoleParams.permissions,
            updatedEntitlemets,
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
        const functionHashForPaymasterProxy = this.getFunctionSigHash(
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
        const functionHashForPaymasterProxy = this.getFunctionSigHash(
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
            freeAllocationForPaidSpace?: ethers.BigNumberish
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

        const space = await this.spaceDapp.getSpace(spaceId)

        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }

        const {
            pricingModule: newPricingModule,
            membershipPrice: newMembershipPrice,
            membershipSupply: newMembershipSupply,
            freeAllocationForPaidSpace: freeAllocation,
        } = args.membershipParams
        const newFreeAllocationForPaidSpace = freeAllocation ?? 1

        const newRuleData = args.updateRoleParams.ruleData
        const newUsers = args.updateRoleParams.users

        const { membershipInfo, roleEntitlements } =
            await this.getDetailsForEditingMembershipSettings(spaceId, space)

        ///////////////////////////////////////////////////////////////////////////////////
        //// update minter role ///////////////////////////////////////////////////////////
        const entitlementShims = await space.getEntitlementShims()
        if (!entitlementShims.length) {
            throw new Error('Rule entitlement not found')
        }

        if (!isEqual(newRuleData, roleEntitlements?.ruleData)) {
            const newRuleDataIsNoop = isEqual(newRuleData, NoopRuleData)

            if (newRuleDataIsNoop && !newUsers.includes(EVERYONE_ADDRESS)) {
                throw new CodeException(
                    'Noop rule entitlement must be used with the everyone address',
                    'USER_OPS_NOOP_REQUIRES_EVERYONE',
                )
            } else if (!newRuleDataIsNoop && newUsers.includes(EVERYONE_ADDRESS)) {
                throw new CodeException(
                    'Rule entitlements cannot be used with the everyone address',
                    'USER_OPS_RULES_CANNOT_BE_USED_WITH_EVERYONE',
                )
            }

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
        // To change a free membership to a paid membership:
        // 1. pricing module must be changed to a non-fixed pricing module
        // 2. freeAllocation must be > 0 (contract reverts otherwise). If set to 1 (recommended), the first membership on the paid space will be free
        // 3. membership price must be set
        //
        // Cannot change a paid space to a free space (contract reverts)

        const pricingModules = await this.spaceDapp.listPricingModules()
        const fixedPricingModule = findFixedPricingModule(pricingModules)
        const dynamicPricingModule = findDynamicPricingModule(pricingModules)

        if (!fixedPricingModule || !dynamicPricingModule) {
            throw new Error('Pricing modules not found')
        }

        const currentPricingModule = await space.Membership.read.getMembershipPricingModule()
        const currentIsFixedPricing =
            currentPricingModule.toLowerCase() ===
            fixedPricingModule.module.toString().toLowerCase()
        const newIsFixedPricing =
            newPricingModule.toLowerCase() === fixedPricingModule.module.toString().toLowerCase()

        // switching to paid space
        if (!currentIsFixedPricing && newIsFixedPricing) {
            const pricingModuleCallData = await space.Membership.encodeFunctionData(
                'setMembershipPricingModule',
                [fixedPricingModule.module],
            )
            txs.push({
                callData: pricingModuleCallData,
                toAddress: space.Membership.address,
            })

            const freeAllocationCallData = await space.Membership.encodeFunctionData(
                'setMembershipFreeAllocation',
                [newFreeAllocationForPaidSpace],
            )
            txs.push({
                callData: freeAllocationCallData,
                toAddress: space.Membership.address,
            })

            const membershipPriceCallData = await space.Membership.encodeFunctionData(
                'setMembershipPrice',
                [newMembershipPrice],
            )
            txs.push({
                callData: membershipPriceCallData,
                toAddress: space.Membership.address,
            })
        }
        // switching to free space
        else if (currentIsFixedPricing && !newIsFixedPricing) {
            throw new CodeException(
                'Cannot change a paid space to a free space',
                'USER_OPS_CANNOT_CHANGE_TO_FREE_SPACE',
            )
        }
        // price update only
        else if (currentIsFixedPricing && newIsFixedPricing) {
            const membershipPriceCallData = await space.Membership.encodeFunctionData(
                'setMembershipPrice',
                [newMembershipPrice],
            )
            txs.push({
                callData: membershipPriceCallData,
                toAddress: space.Membership.address,
            })
        }
        // free space to free space
        else if (!currentIsFixedPricing && !newIsFixedPricing) {
            // do nothing
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

        ///////////////////////////////////////////////////////////////////////////////////
        //// update prepay seats //////////////////////////////////////////////////////////
        //
        // TODO: get this to work in its own M
        // also, need to pass value for prepayMembership
        // executeBatch does not support value
        // therefore this tx would have to be separate
        //
        // if (!prepaidMembershipSupply.eq(ethers.BigNumber.from(newPrepaidSupply))) {
        //     const callData = await this.spaceDapp.prepay.encodeFunctionData('prepayMembership', [
        //         space.Membership.address,
        //         newPrepaidSupply,
        //     ])
        //     txs.push({
        //         callData,
        //         toAddress: this.spaceDapp.prepay.address,
        //     })
        // }
        ///////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////

        return this.sendUserOp({
            toAddress: txs.map((tx) => tx.toAddress),
            callData: txs.map((tx) => tx.callData),
            signer: args.signer,
            spaceId,
            functionHashForPaymasterProxy: 'editMembershipSettings',
        })
    }

    public async sendPrepayMembershipOp(args: {
        spaceId: string
        prepaidSupply: ethers.BigNumberish
        signer: ethers.Signer
    }) {
        const { spaceId, prepaidSupply, signer } = args

        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }
        const space = await this.spaceDapp.getSpace(spaceId)

        if (!space) {
            throw new Error(`Space with spaceId "${spaceId}" is not found.`)
        }

        const callData = await this.spaceDapp.prepay.encodeFunctionData('prepayMembership', [
            space.Membership.address,
            prepaidSupply,
        ])

        return this.sendUserOp({
            toAddress: this.spaceDapp.prepay.address,
            callData,
            signer,
            spaceId,
            functionHashForPaymasterProxy: 'prepayMembership',
        })
    }

    // Initialize a builder with middleware based on paymaster config
    //
    // Because we are still determining exactly how we are using paymaster,
    // and userop.js doesn't allow for add/remove a specific middleware from the middleware stack,
    // each user operation can just initiliaze a new builder to make things simpler
    private async initBuilder(
        args: UserOpParams & {
            // a function signature hash to pass to paymaster proxy - this is just the function name for now
            functionHashForPaymasterProxy?: string
            spaceId?: string
        },
    ) {
        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }
        const { signer } = args

        return Presets.Builder.SimpleAccount.init(signer, this.aaRpcUrl, {
            entryPoint: this.entryPointAddress,
            factory: this.factoryAddress,
            overrideBundlerRpc: this.bundlerUrl,
            // salt?: BigNumberish;
            // nonceKey?: number;
            paymasterMiddleware: async () => {
                // this is moved to sendUserOp but passing an empty function here so
                // that userop does not estimate the gas, which we do in other middleware
            },
        })
    }

    /**
     * should return a matching functionHash for paymaster proxy validation
     * TODO: proxy still uses function name, not sigHash
     */
    private getFunctionSigHash<ContractInterface extends ethers.utils.Interface>(
        _contractInterface: ContractInterface,
        functionHash: keyof typeof FunctionHash,
    ) {
        return functionHash
        // TODO: swap to this
        // const frag = contractInterface.getFunction(functionName)
        // return frag.format() // format sigHash
    }
}

async function getSignerAddress(signer: ethers.Signer): Promise<Address> {
    const address = await signer.getAddress()
    return address as Address
}
