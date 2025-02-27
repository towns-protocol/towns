import {
    Address,
    SpaceDapp,
    UpdateRoleParams,
    LegacyUpdateRoleParams,
    Space,
} from '@river-build/web3'
import { ethers } from 'ethers'
import { UserOpsConfig, UserOpParams, FunctionHash, TimeTracker, TimeTrackerEvents } from './types'
import { selectUserOpsByAddress, userOpsStore } from './store/userOpsStore'
import { ERC4337 } from 'userop/dist/constants'
import { InsufficientTipBalanceException } from './errors'
import { OpToJSON } from './utils/opToJson'
import { isUsingAlchemyBundler } from './utils/isUsingAlchemyBundler'
import {
    signUserOpHash,
    estimateGasLimit,
    subtractGasFromBalance,
    promptUser,
    isSponsoredOp,
    paymasterProxyMiddleware,
    totalCostOfUserOp,
    balanceOf,
    estimateGasFeesMiddleware,
} from './middlewares'
import { TownsSimpleAccount } from './lib/useropjs/TownsSimpleAccount'
import {
    TownsUserOpClient,
    TownsUserOpClientSendUserOperationResponse,
} from './lib/useropjs/TownsUserOpClient'
import { sendUserOperationWithRetry } from './lib/sendUserOperationWithRetry'
import { decodeCallData, isBatchData, isSingleData } from './utils/decodeCallData'
import { getUserOperationReceipt } from './lib/getUserOperationReceipt'
import {
    removeLink,
    linkEOA,
    linkSmartAccount,
    joinSpace,
    createSpace,
    createLegacySpace,
    updateSpaceInfo,
    updateChannel,
    createRole,
    legacyCreateRole,
    deleteRole,
    setChannelPermissionOverrides,
    clearChannelPermissionOverrides,
    createChannel,
    legacyUpdateRole,
    updateRole,
    banWallet,
    unbanWallet,
    editMembership,
    legacyEditMembership,
    prepayMembership,
    transferEth,
    withdrawSpaceFunds,
    transferAssets,
    refreshMetadata,
    tip,
    checkIn,
} from './operations'
import { getAbstractAccountAddress } from './utils/getAbstractAccountAddress'
import { review } from './operations/review'

interface ReviewParams {
    spaceId: string
    rating: number
    comment: string
    isUpdate?: boolean
    isDelete?: boolean
    signer: ethers.Signer
}

export class UserOps {
    private bundlerUrl: string
    private aaRpcUrl: string
    private paymasterProxyUrl: string | undefined
    // defaults to Stackup's deployed entry point
    private entryPointAddress: string | undefined
    // defaults to Stackup's deployed factory
    private factoryAddress: string | undefined
    private paymasterProxyAuthSecret: string | undefined
    private userOpClient: Promise<TownsUserOpClient> | undefined
    private builder: Promise<TownsSimpleAccount> | undefined
    protected spaceDapp: SpaceDapp | undefined
    private timeTracker: TimeTracker | undefined
    private fetchAccessTokenFn: (() => Promise<string | null>) | undefined
    private middlewareInitialized = false

    constructor(
        config: UserOpsConfig & {
            spaceDapp: SpaceDapp
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
        this.timeTracker = config.timeTracker
        this.fetchAccessTokenFn = config.fetchAccessTokenFn
    }

    public async getAbstractAccountAddress({
        rootKeyAddress,
    }: {
        rootKeyAddress: Address
    }): Promise<Address | undefined> {
        return getAbstractAccountAddress({
            ...this.commonParams(),
            rootKeyAddress,
        })
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
        const builder = await this.getBuilder({ signer: args.signer })
        const sender = builder.getSenderAddress()

        const timeTracker = this.timeTracker

        let endInitBuilder: (() => void) | undefined
        if (sequenceName) {
            endInitBuilder = timeTracker?.startMeasurement(sequenceName, 'userops_init_builder')
        }

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

        const op = simpleAccount.getOp()

        const resetUseropStore = () => {
            const { setCurrent, reset, setSequenceName } = userOpsStore.getState()
            reset(sender)
            const space = args.spaceId ? this.spaceDapp?.getSpace(args.spaceId) : undefined
            const decodedCallData = decodeCallData({
                callData: op.callData,
                functionHash: args.functionHashForPaymasterProxy,
                builder,
                space,
            })
            setSequenceName(sender, sequenceName)
            setCurrent({
                sender,
                op: OpToJSON(op),
                value: args.value,
                decodedCallData,
                functionHashForPaymasterProxy: args.functionHashForPaymasterProxy,
                spaceId: args.spaceId,
            })
        }

        const pendingUserOp = selectUserOpsByAddress(sender).pending

        if (pendingUserOp.hash) {
            try {
                // check if the pending op has landed
                const result = await getUserOperationReceipt({
                    provider: builder.provider,
                    userOpHash: pendingUserOp.hash,
                })
                if (result) {
                    resetUseropStore()
                }
            } catch (error) {
                // TODO: retry getUserOperationReceipt
                console.log('[UserOperations] error getting user operation receipt', error)
                resetUseropStore()
            }
        } else {
            resetUseropStore()
        }

        const opResponse = await sendUserOperationWithRetry({
            userOpClient,
            simpleAccount,
            retryCount: args.retryCount,
            onBuild: (op) => {
                // update finalized op
                userOpsStore.getState().setCurrent({
                    sender,
                    op: OpToJSON(op),
                })
            },
        })

        // if op made it to the bundler, copy to pending
        userOpsStore.getState().setPending({
            sender,
            hash: opResponse.userOpHash,
        })
        return opResponse
    }

    public async dropAndReplace(hash: string, signer: ethers.Signer) {
        const builder = await this.getBuilder({ signer })
        const sender = builder.getSenderAddress()
        const userOpState = selectUserOpsByAddress(sender, userOpsStore.getState())
        if (!userOpState) {
            throw new Error('current user op not found')
        }
        const pending = userOpState.pending

        if (!pending.op?.callData) {
            throw new Error('user op call data not found')
        }
        if (pending.hash !== hash) {
            throw new Error('user op hash does not match')
        }
        if (!pending.functionHashForPaymasterProxy) {
            throw new Error('user op function hash for paymaster proxy not found')
        }
        if (!pending.decodedCallData) {
            throw new Error('user op decoded call data not found')
        }

        const spaceId = pending.spaceId
        const functionHashForPaymasterProxy = pending.functionHashForPaymasterProxy

        if (isBatchData(pending.decodedCallData)) {
            const { toAddress, value, executeData } = pending.decodedCallData
            return this.sendUserOp({
                toAddress,
                callData: executeData,
                signer,
                spaceId,
                functionHashForPaymasterProxy,
                value,
            })
        } else if (isSingleData(pending.decodedCallData)) {
            const { toAddress, value, executeData } = pending.decodedCallData
            return this.sendUserOp({
                toAddress,
                callData: executeData,
                signer,
                spaceId,
                functionHashForPaymasterProxy,
                value,
            })
        } else {
            throw new Error('mismatch in format of toAddress and callData')
        }
    }

    public async sendCreateLegacySpaceOp(
        args: Parameters<SpaceDapp['createLegacySpace']>,
    ): Promise<TownsUserOpClientSendUserOperationResponse> {
        return createLegacySpace({
            ...this.commonParams(),
            fnArgs: args,
        })
    }

    public async sendCreateSpaceOp(
        args: Parameters<SpaceDapp['createSpace']>,
    ): Promise<TownsUserOpClientSendUserOperationResponse> {
        return createSpace({
            ...this.commonParams(),
            fnArgs: args,
        })
    }

    private commonParams() {
        return {
            spaceDapp: this.spaceDapp,
            timeTracker: this.timeTracker,
            entryPointAddress: this.entryPointAddress,
            factoryAddress: this.factoryAddress,
            aaRpcUrl: this.aaRpcUrl,
            sendUserOp: this.sendUserOp.bind(this),
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

    private clearStore(sender: string | undefined) {
        if (sender) {
            userOpsStore.getState().reset(sender)
        }
    }

    /**
     * Join a space, potentially linking a wallet if necessary
     */
    public async sendJoinSpaceOp(
        args: Parameters<SpaceDapp['joinSpace']>,
    ): Promise<TownsUserOpClientSendUserOperationResponse> {
        return joinSpace({
            ...this.commonParams(),
            fnArgs: args,
        })
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
        return linkSmartAccount({
            ...this.commonParams(),
            rootKeySigner,
            abstractAccountAddress,
            sequenceName,
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
        return linkEOA({
            ...this.commonParams(),
            fnArgs: args,
        })
    }

    public async sendRemoveWalletLinkOp(
        args: Parameters<SpaceDapp['walletLink']['removeLink']>,
    ): Promise<TownsUserOpClientSendUserOperationResponse> {
        return removeLink({
            ...this.commonParams(),
            fnArgs: args,
        })
    }

    public async sendUpdateSpaceInfoOp(
        args: Parameters<SpaceDapp['updateSpaceInfo']>,
    ): Promise<TownsUserOpClientSendUserOperationResponse> {
        return updateSpaceInfo({
            ...this.commonParams(),
            fnArgs: args,
        })
    }

    public async sendCreateChannelOp(
        args: Parameters<SpaceDapp['createChannelWithPermissionOverrides']>,
    ): Promise<TownsUserOpClientSendUserOperationResponse> {
        return createChannel({
            ...this.commonParams(),
            fnArgs: args,
        })
    }

    public async sendUpdateChannelOp(
        args: Parameters<SpaceDapp['updateChannel']>,
    ): Promise<TownsUserOpClientSendUserOperationResponse> {
        return updateChannel({
            ...this.commonParams(),
            fnArgs: args,
        })
    }

    public async sendLegacyCreateRoleOp(
        args: Parameters<SpaceDapp['legacyCreateRole']>,
    ): Promise<TownsUserOpClientSendUserOperationResponse> {
        return legacyCreateRole({
            ...this.commonParams(),
            fnArgs: args,
        })
    }

    public async sendCreateRoleOp(
        args: Parameters<SpaceDapp['createRole']>,
    ): Promise<TownsUserOpClientSendUserOperationResponse> {
        return createRole({
            ...this.commonParams(),
            fnArgs: args,
        })
    }

    public async sendDeleteRoleOp(
        args: Parameters<SpaceDapp['deleteRole']>,
    ): Promise<TownsUserOpClientSendUserOperationResponse> {
        return deleteRole({
            ...this.commonParams(),
            fnArgs: args,
        })
    }

    public async sendUpdateRoleOp(
        args: Parameters<SpaceDapp['updateRole']>,
    ): Promise<TownsUserOpClientSendUserOperationResponse> {
        return updateRole({
            ...this.commonParams(),
            fnArgs: args,
        })
    }

    public async sendSetChannelPermissionOverridesOp(
        args: Parameters<SpaceDapp['setChannelPermissionOverrides']>,
    ): Promise<TownsUserOpClientSendUserOperationResponse> {
        return setChannelPermissionOverrides({
            ...this.commonParams(),
            fnArgs: args,
        })
    }

    public async sendClearChannelPermissionOverridesOp(
        args: Parameters<SpaceDapp['clearChannelPermissionOverrides']>,
    ): Promise<TownsUserOpClientSendUserOperationResponse> {
        return clearChannelPermissionOverrides({
            ...this.commonParams(),
            fnArgs: args,
        })
    }

    public async sendLegacyUpdateRoleOp(
        args: Parameters<SpaceDapp['legacyUpdateRole']>,
    ): Promise<TownsUserOpClientSendUserOperationResponse> {
        return legacyUpdateRole({
            ...this.commonParams(),
            fnArgs: args,
        })
    }

    public async sendBanWalletAddressOp(args: Parameters<SpaceDapp['banWalletAddress']>) {
        return banWallet({
            ...this.commonParams(),
            fnArgs: args,
        })
    }

    public async sendUnbanWalletAddressOp(args: Parameters<SpaceDapp['unbanWalletAddress']>) {
        return unbanWallet({
            ...this.commonParams(),
            fnArgs: args,
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
        return editMembership({
            ...this.commonParams(),
            spaceId: args.spaceId,
            updateRoleParams: args.updateRoleParams,
            membershipParams: args.membershipParams,
            signer: args.signer,
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
        return legacyEditMembership({
            ...this.commonParams(),
            spaceId: args.spaceId,
            legacyUpdateRoleParams: args.legacyUpdateRoleParams,
            membershipParams: args.membershipParams,
            signer: args.signer,
        })
    }

    public async sendPrepayMembershipOp(args: Parameters<SpaceDapp['prepayMembership']>) {
        return prepayMembership({
            ...this.commonParams(),
            fnArgs: args,
        })
    }

    public async sendTransferEthOp(
        transferData: {
            recipient: string
            value: ethers.BigNumberish
        },
        signer: ethers.Signer,
    ) {
        return transferEth({
            ...this.commonParams(),
            transferData,
            signer,
        })
    }

    public async sendWithdrawSpaceFundsOp(args: Parameters<SpaceDapp['withdrawSpaceFunds']>) {
        return withdrawSpaceFunds({
            ...this.commonParams(),
            fnArgs: args,
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
        const provider = (await this.getBuilder({ signer })).provider
        return transferAssets({
            ...this.commonParams(),
            transferData,
            signer,
            provider,
        })
    }

    public async refreshMetadata(args: Parameters<SpaceDapp['refreshMetadata']>) {
        return refreshMetadata({
            ...this.commonParams(),
            fnArgs: args,
        })
    }

    public async sendTipOp(args: Parameters<SpaceDapp['tip']>) {
        return tip({
            ...this.commonParams(),
            fnArgs: args,
        })
    }

    public async sendCheckInOp(args: Parameters<SpaceDapp['airdrop']['checkIn']>) {
        return checkIn({
            ...this.commonParams(),
            fnArgs: args,
        })
    }

    public async sendReviewOp(args: [ReviewParams, ethers.Signer]) {
        return review({
            ...this.commonParams(),
            fnArgs: args,
        })
    }

    public async sendUserOperationWithCallData(
        args: {
            value: bigint
            signer: ethers.Signer
        } & ({ callData: string; toAddress: string } | { callData: string[]; toAddress: string[] }),
    ) {
        return this.sendUserOp({
            ...args,
            spaceId: undefined,
            functionHashForPaymasterProxy: 'unsponsored',
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

    private addMiddleware({
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
                    return estimateGasFeesMiddleware(ctx, builder.provider)
                }
            })
            // pass user op with new gas data to paymaster.
            // If approved, paymaster returns preverification gas and we assign it to the user operation.
            // The userop fields can no longer be manipulated or else the paymaster sig will be invalid
            //
            // If rejected, gas must be estimated in later middleware
            .useMiddleware(async (ctx) => {
                if (this.paymasterProxyUrl && this.paymasterProxyAuthSecret) {
                    const { sequenceName, current } = selectUserOpsByAddress(ctx.op.sender)

                    let endPaymasterMiddleware: (() => void) | undefined

                    if (sequenceName) {
                        endPaymasterMiddleware = timeTracker?.startMeasurement(
                            sequenceName,
                            `userops_${current.functionHashForPaymasterProxy}_paymasterProxyMiddleware`,
                        )
                    }
                    await paymasterProxyMiddleware({
                        rootKeyAddress: await signer.getAddress(),
                        userOpContext: ctx,
                        paymasterProxyAuthSecret: this.paymasterProxyAuthSecret,
                        paymasterProxyUrl: this.paymasterProxyUrl,
                        bundlerUrl: this.bundlerUrl,
                        provider: builder.provider,
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
                    return estimateGasFeesMiddleware(ctx, builder.provider)
                }
            })
            .useMiddleware(async (ctx) => {
                const { current } = selectUserOpsByAddress(ctx.op.sender)
                const { spaceId, functionHashForPaymasterProxy } = current
                if (isSponsoredOp(ctx)) {
                    return
                }
                return estimateGasLimit({
                    ctx,
                    provider: builder.provider,
                    bundlerUrl: this.bundlerUrl,
                    spaceId,
                    spaceDapp: this.spaceDapp,
                    functionHashForPaymasterProxy: functionHashForPaymasterProxy,
                })
            })
            // we have gas limits, estimates paymaster, nonce, etc now, so update the current op
            .useMiddleware(async (ctx) => {
                userOpsStore.getState().setCurrent({
                    sender: ctx.op.sender,
                    op: OpToJSON(ctx.op),
                })
                await Promise.resolve()
            })
            // prompt user if the paymaster rejected
            .useMiddleware(async (ctx) => {
                if (isSponsoredOp(ctx)) {
                    return
                }
                const { current } = selectUserOpsByAddress(ctx.op.sender)

                // tip is a special case
                // - it is not sponsored
                // - it will make tx without prompting user
                // - we only want to prompt user if not enough balance in sender wallet
                if (current.functionHashForPaymasterProxy === 'tip') {
                    const op = ctx.op
                    const totalCost = totalCostOfUserOp({
                        gasLimit: op.callGasLimit,
                        preVerificationGas: op.preVerificationGas,
                        verificationGasLimit: op.verificationGasLimit,
                        gasPrice: op.maxFeePerGas,
                        value: current.value,
                    })
                    const balance = await balanceOf(op.sender, builder.provider)

                    if (balance.lt(totalCost)) {
                        throw new InsufficientTipBalanceException()
                    }
                } else {
                    await promptUser(ctx.op.sender)
                }
            })
            .useMiddleware(async (ctx) => {
                const { current } = selectUserOpsByAddress(ctx.op.sender)
                const { functionHashForPaymasterProxy, value } = current

                if (value && functionHashForPaymasterProxy === 'transferEth') {
                    return subtractGasFromBalance(ctx, {
                        functionHash: functionHashForPaymasterProxy,
                        builder,
                        value,
                    })
                }
            })
            .useMiddleware(async (ctx) => signUserOpHash(ctx, signer))
    }

    /**
     * Collectively these calls can take > 1s
     * So optionally you can call this method to prep the builder and userOpClient prior to sending the first user operation
     */
    public async setup(signer: ethers.Signer) {
        return Promise.all([this.getBuilder({ signer }), this.getUserOpClient()])
    }

    public async reset() {
        const sender = (await this.builder)?.getSenderAddress()
        this.builder = undefined
        this.userOpClient = undefined
        this.middlewareInitialized = false
        this.clearStore(sender)
    }
}
