import { Address, SpaceDapp, UpdateRoleParams, LegacyUpdateRoleParams } from '@towns-protocol/web3'
import { ethers } from 'ethers'
import { UserOpsConfig, FunctionHash, TimeTracker, TimeTrackerEvents } from './types'
import { selectUserOpsByAddress, userOpsStore } from './store/userOpsStore'
import { SendUserOperationReturnType } from './lib/types'
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
    review,
    TownsReviewParams,
} from './operations'
import { getAbstractAccountAddress } from './utils/getAbstractAccountAddress'
import { isSingleData, isBatchData, decodeCallData } from './utils/decodeCallData'
import { TSmartAccount } from './lib/permissionless/accounts/createSmartAccountClient'
import {
    sendUseropWithPermissionless,
    UserOpParamsPermissionless,
} from './lib/permissionless/sendUseropWithPermissionless'
import { simpleSmartAccount } from './lib/permissionless/accounts/simple/client'

export class UserOps {
    private bundlerUrl: string
    private aaRpcUrl: string
    private paymasterProxyUrl: string | undefined
    private paymasterProxyAuthSecret: string | undefined
    protected spaceDapp: SpaceDapp | undefined
    private timeTracker: TimeTracker | undefined
    private fetchAccessTokenFn: (() => Promise<string | null>) | undefined
    private smartAccount: Promise<TSmartAccount> | undefined

    constructor(
        config: UserOpsConfig & {
            spaceDapp: SpaceDapp
            timeTracker?: TimeTracker
        },
    ) {
        this.bundlerUrl = config.bundlerUrl ?? ''
        this.aaRpcUrl = config.aaRpcUrl
        this.paymasterProxyUrl = config.paymasterProxyUrl
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

    public async sendUserOp(
        args: UserOpParamsPermissionless & {
            // a function signature hash to pass to paymaster proxy - this is just the function name for now
            functionHashForPaymasterProxy: FunctionHash
            spaceId: string | undefined
            retryCount?: number
        },
        sequenceName?: TimeTrackerEvents,
    ): Promise<SendUserOperationReturnType> {
        const { functionHashForPaymasterProxy, spaceId, retryCount, ...rest } = args
        return this.sendUserOpWithPermissionless(
            {
                functionHashForPaymasterProxy,
                spaceId,
                retryCount,
                ...(rest as UserOpParamsPermissionless),
            },
            sequenceName,
        )
    }

    public async getSmartAccountClient(args: { signer: ethers.Signer }) {
        if (!this.smartAccount) {
            if (!this.paymasterProxyUrl) {
                throw new Error('paymasterProxyUrl is required')
            }
            if (!this.paymasterProxyAuthSecret) {
                throw new Error('paymasterProxyAuthSecret is required')
            }
            const { signer } = args
            this.smartAccount = simpleSmartAccount({
                signer: signer,
                rpcUrl: this.aaRpcUrl,
                bundlerUrl: this.bundlerUrl,
                paymasterProxyUrl: this.paymasterProxyUrl,
                paymasterProxyAuthSecret: this.paymasterProxyAuthSecret,
                spaceDapp: this.spaceDapp,
                fetchAccessTokenFn: this.fetchAccessTokenFn,
            })
        }
        return this.smartAccount
    }

    private commonParams() {
        return {
            spaceDapp: this.spaceDapp,
            timeTracker: this.timeTracker,
            aaRpcUrl: this.aaRpcUrl,
            sendUserOp: this.sendUserOp.bind(this),
        }
    }

    private clearStore(sender: string | undefined) {
        if (sender) {
            userOpsStore.getState().reset(sender)
        }
    }

    private async sendUserOpWithPermissionless(
        args: UserOpParamsPermissionless & {
            functionHashForPaymasterProxy: FunctionHash
            spaceId: string | undefined
            retryCount?: number
        },
        sequenceName?: TimeTrackerEvents,
    ): Promise<SendUserOperationReturnType> {
        const timeTracker = this.timeTracker

        let endInitClient: (() => void) | undefined
        if (sequenceName) {
            endInitClient = timeTracker?.startMeasurement(sequenceName, 'userops_init_client')
        }
        const smartAccountClient = await this.getSmartAccountClient({ signer: args.signer })
        endInitClient?.()

        if (Array.isArray(args.toAddress) && Array.isArray(args.callData)) {
            return sendUseropWithPermissionless({
                ...args,
                smartAccountClient,
            })
        } else if (typeof args.toAddress === 'string' && typeof args.callData === 'string') {
            return sendUseropWithPermissionless({
                ...args,
                smartAccountClient,
            })
        }
        throw new Error('[UserOperations.sendUserOpWithPermissionless]::Invalid arguments')
    }

    public async dropAndReplace(hash: string, signer: ethers.Signer) {
        const sender = (await this.getSmartAccountClient({ signer })).address
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
        const pendingDecodedCallData = decodeCallData({
            callData: pending.op.callData,
            functionHash: pending.functionHashForPaymasterProxy,
        })

        const spaceId = pending.spaceId
        const functionHashForPaymasterProxy = pending.functionHashForPaymasterProxy

        if (isBatchData(pendingDecodedCallData)) {
            const { toAddress, value, executeData } = pendingDecodedCallData
            return this.sendUserOp({
                toAddress,
                callData: executeData,
                signer,
                spaceId,
                functionHashForPaymasterProxy,
                value,
            })
        } else if (isSingleData(pendingDecodedCallData)) {
            const { toAddress, value, executeData } = pendingDecodedCallData
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
    ): Promise<SendUserOperationReturnType> {
        const smartAccountClient = await this.getSmartAccountClient({ signer: args[1] })
        return createLegacySpace({
            ...this.commonParams(),
            factoryAddress: smartAccountClient.factoryAddress,
            entryPointAddress: smartAccountClient.entrypointAddress,
            fnArgs: args,
        })
    }

    public async sendCreateSpaceOp(
        args: Parameters<SpaceDapp['createSpace']>,
    ): Promise<SendUserOperationReturnType> {
        const smartAccountClient = await this.getSmartAccountClient({ signer: args[1] })
        return createSpace({
            ...this.commonParams(),
            factoryAddress: smartAccountClient.factoryAddress,
            entryPointAddress: smartAccountClient.entrypointAddress,
            fnArgs: args,
        })
    }

    /**
     * Join a space, potentially linking a wallet if necessary
     */
    public async sendJoinSpaceOp(
        args: Parameters<SpaceDapp['joinSpace']>,
    ): Promise<SendUserOperationReturnType> {
        const smartAccountClient = await this.getSmartAccountClient({ signer: args[2] })
        return joinSpace({
            ...this.commonParams(),
            factoryAddress: smartAccountClient.factoryAddress,
            entryPointAddress: smartAccountClient.entrypointAddress,
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
    ): Promise<SendUserOperationReturnType> {
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
    ): Promise<SendUserOperationReturnType> {
        return removeLink({
            ...this.commonParams(),
            fnArgs: args,
        })
    }

    public async sendUpdateSpaceInfoOp(
        args: Parameters<SpaceDapp['updateSpaceInfo']>,
    ): Promise<SendUserOperationReturnType> {
        return updateSpaceInfo({
            ...this.commonParams(),
            fnArgs: args,
        })
    }

    public async sendCreateChannelOp(
        args: Parameters<SpaceDapp['createChannelWithPermissionOverrides']>,
    ): Promise<SendUserOperationReturnType> {
        return createChannel({
            ...this.commonParams(),
            fnArgs: args,
        })
    }

    public async sendUpdateChannelOp(
        args: Parameters<SpaceDapp['updateChannel']>,
    ): Promise<SendUserOperationReturnType> {
        return updateChannel({
            ...this.commonParams(),
            fnArgs: args,
        })
    }

    public async sendLegacyCreateRoleOp(
        args: Parameters<SpaceDapp['legacyCreateRole']>,
    ): Promise<SendUserOperationReturnType> {
        return legacyCreateRole({
            ...this.commonParams(),
            fnArgs: args,
        })
    }

    public async sendCreateRoleOp(
        args: Parameters<SpaceDapp['createRole']>,
    ): Promise<SendUserOperationReturnType> {
        return createRole({
            ...this.commonParams(),
            fnArgs: args,
        })
    }

    public async sendDeleteRoleOp(
        args: Parameters<SpaceDapp['deleteRole']>,
    ): Promise<SendUserOperationReturnType> {
        return deleteRole({
            ...this.commonParams(),
            fnArgs: args,
        })
    }

    public async sendUpdateRoleOp(
        args: Parameters<SpaceDapp['updateRole']>,
    ): Promise<SendUserOperationReturnType> {
        return updateRole({
            ...this.commonParams(),
            fnArgs: args,
        })
    }

    public async sendSetChannelPermissionOverridesOp(
        args: Parameters<SpaceDapp['setChannelPermissionOverrides']>,
    ): Promise<SendUserOperationReturnType> {
        return setChannelPermissionOverrides({
            ...this.commonParams(),
            fnArgs: args,
        })
    }

    public async sendClearChannelPermissionOverridesOp(
        args: Parameters<SpaceDapp['clearChannelPermissionOverrides']>,
    ): Promise<SendUserOperationReturnType> {
        return clearChannelPermissionOverrides({
            ...this.commonParams(),
            fnArgs: args,
        })
    }

    public async sendLegacyUpdateRoleOp(
        args: Parameters<SpaceDapp['legacyUpdateRole']>,
    ): Promise<SendUserOperationReturnType> {
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
        const smartAccountClient = await this.getSmartAccountClient({ signer })
        return transferEth({
            ...this.commonParams(),
            transferData,
            signer,
            factoryAddress: smartAccountClient.factoryAddress,
            entryPointAddress: smartAccountClient.entrypointAddress,
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
        const smartAccountClient = await this.getSmartAccountClient({ signer })
        return transferAssets({
            ...this.commonParams(),
            transferData,
            signer,
            client: smartAccountClient.publicRpcClient,
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

    public async sendReviewOp(args: [TownsReviewParams, ethers.Signer]) {
        return review({
            ...this.commonParams(),
            fnArgs: args,
        })
    }

    public async sendTokenTransferOperationWithCallData(
        args: {
            value: bigint
            signer: ethers.Signer
        } & ({ callData: string; toAddress: string } | { callData: string[]; toAddress: string[] }),
    ) {
        return this.sendUserOp({
            ...args,
            spaceId: undefined,
            functionHashForPaymasterProxy: 'trading',
        })
    }

    /**
     * Collectively these calls can take > 1s
     * So optionally you can call this method to prep the builder and userOpClient prior to sending the first user operation
     */
    public async setup(signer: ethers.Signer) {
        return Promise.all([this.getSmartAccountClient({ signer })])
    }

    public async reset() {
        const sender = (await this.smartAccount)?.address
        this.smartAccount = undefined
        this.clearStore(sender)
    }
}
