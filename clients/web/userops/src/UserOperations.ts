import { Address, SpaceDapp, UpdateRoleParams, LegacyUpdateRoleParams } from '@towns-protocol/web3'
import { ethers } from 'ethers'
import { UserOpsConfig, FunctionHash, TimeTracker, TimeTrackerEvents } from './types'
import { userOpsStore } from './store/userOpsStore'
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
    upgradeToAndCall,
} from './operations'
import { getAbstractAccountAddress } from './utils/getAbstractAccountAddress'
// import { isSingleData, isBatchData, decodeCallData } from './utils/decodeCallData'
import { TSmartAccount } from './lib/permissionless/accounts/createSmartAccountClient'
import {
    sendUseropWithPermissionless,
    UserOpParamsPermissionless,
} from './lib/permissionless/sendUseropWithPermissionless'
import { setupSmartAccount } from './lib/permissionless/accounts/setupSmartAccount'
import { SmartAccountType } from './types'
import { needsUpgrade } from './utils/needsUpgrade'

export class UserOps {
    private bundlerUrl: string
    private aaRpcUrl: string
    private paymasterProxyUrl: string | undefined
    private paymasterProxyAuthSecret: string | undefined
    protected spaceDapp: SpaceDapp | undefined
    private timeTracker: TimeTracker | undefined
    private fetchAccessTokenFn: (() => Promise<string | null>) | undefined
    private smartAccount: Promise<TSmartAccount> | undefined
    private newAccountImplementationType: SmartAccountType

    constructor(
        config: UserOpsConfig & {
            spaceDapp: SpaceDapp
            timeTracker?: TimeTracker
        },
    ) {
        if (!config.newAccountImplementationType) {
            throw new Error('newAccountImplementationType is required')
        }

        this.bundlerUrl = config.bundlerUrl ?? ''
        this.aaRpcUrl = config.aaRpcUrl
        this.paymasterProxyUrl = config.paymasterProxyUrl
        this.paymasterProxyAuthSecret = config.paymasterProxyAuthSecret
        this.spaceDapp = config.spaceDapp
        this.timeTracker = config.timeTracker
        this.fetchAccessTokenFn = config.fetchAccessTokenFn
        this.newAccountImplementationType = config.newAccountImplementationType
    }

    public async getAbstractAccountAddress({
        rootKeyAddress,
    }: {
        rootKeyAddress: Address
    }): Promise<Address | undefined> {
        if (!this.paymasterProxyUrl || !this.paymasterProxyAuthSecret) {
            throw new Error('paymasterProxyUrl and paymasterProxyAuthSecret are required')
        }
        return getAbstractAccountAddress({
            ...this.commonParams(),
            rootKeyAddress,
            newAccountImplementationType: this.newAccountImplementationType,
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
        const {
            functionHashForPaymasterProxy,
            spaceId,
            retryCount,
            signer,
            toAddress,
            callData,
            value,
        } = args

        const timeTracker = this.timeTracker

        let endInitClient: (() => void) | undefined
        if (sequenceName) {
            endInitClient = timeTracker?.startMeasurement(sequenceName, 'userops_init_client')
        }
        let smartAccountClient = await this.getSmartAccountClient({ signer })
        endInitClient?.()

        if (!this.bundlerUrl) {
            throw new Error('bundlerUrl is required')
        }
        if (!this.aaRpcUrl) {
            throw new Error('aaRpcUrl is required')
        }
        if (!this.paymasterProxyUrl) {
            throw new Error('paymasterProxyUrl is required')
        }
        if (!this.paymasterProxyAuthSecret) {
            throw new Error('paymasterProxyAuthSecret is required')
        }
        if (!this.spaceDapp) {
            throw new Error('spaceDapp is required')
        }

        let result: SendUserOperationReturnType & { didUpgrade?: boolean }
        const _needsUpgrade = needsUpgrade(this.newAccountImplementationType, smartAccountClient)

        if (
            _needsUpgrade &&
            ((typeof value === 'bigint' && value > 0n) ||
                (Array.isArray(value) && value.some((v) => v > 0n)))
        ) {
            // most userops can be batched with the upgrade op.
            // but if the op is passing a value (tipping, joining a paid space, etc), we can't encodeExecuteBatch with values on a simple account, so we need to upgrade first
            const upgradeOp = await this.sendUpgradeToAndCallOp({ signer })
            const receipt = await upgradeOp.getUserOperationReceipt()
            if (!receipt) {
                throw new Error('Upgrade to waiting for receipt timed out')
            }
            if (!receipt.success) {
                throw new Error('Upgrade to failed')
            }
            this.smartAccount = undefined
            smartAccountClient = await this.getSmartAccountClient({ signer })
        }

        if (Array.isArray(toAddress) && Array.isArray(callData)) {
            const _value = Array.isArray(value) ? value : toAddress.map(() => value ?? 0n)
            result = await sendUseropWithPermissionless({
                value: _value,
                toAddress,
                callData,
                functionHashForPaymasterProxy,
                spaceId,
                retryCount,
                smartAccountClient,
                signer,
                newAccountImplementationType: this.newAccountImplementationType,
            })
        } else if (typeof toAddress === 'string' && typeof callData === 'string') {
            const _value = typeof value === 'bigint' ? value : undefined
            result = await sendUseropWithPermissionless({
                value: _value,
                toAddress,
                callData,
                functionHashForPaymasterProxy,
                spaceId,
                retryCount,
                smartAccountClient,
                signer,
                newAccountImplementationType: this.newAccountImplementationType,
            })
        } else {
            throw new Error('[UserOperations.sendUserOpWithPermissionless]::Invalid arguments')
        }

        if (result.didUpgrade) {
            this.smartAccount = undefined
        }

        return result
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

            this.smartAccount = setupSmartAccount({
                newAccountImplementationType: this.newAccountImplementationType,
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
        if (!this.paymasterProxyUrl || !this.paymasterProxyAuthSecret) {
            throw new Error('paymasterProxyUrl and paymasterProxyAuthSecret are required')
        }
        return {
            spaceDapp: this.spaceDapp,
            timeTracker: this.timeTracker,
            aaRpcUrl: this.aaRpcUrl,
            paymasterProxyUrl: this.paymasterProxyUrl,
            paymasterProxyAuthSecret: this.paymasterProxyAuthSecret,
            sendUserOp: this.sendUserOp.bind(this),
        }
    }

    private clearStore(sender: string | undefined) {
        if (sender) {
            userOpsStore.getState().reset(sender)
        }
    }

    // public async dropAndReplace(hash: string, signer: ethers.Signer) {
    //     const sender = (await this.getSmartAccountClient({ signer })).address
    //     const userOpState = selectUserOpsByAddress(sender, userOpsStore.getState())
    //     if (!userOpState) {
    //         throw new Error('current user op not found')
    //     }
    //     const pending = userOpState.pending

    //     if (!pending.op?.callData) {
    //         throw new Error('user op call data not found')
    //     }
    //     if (pending.hash !== hash) {
    //         throw new Error('user op hash does not match')
    //     }
    //     if (!pending.functionHashForPaymasterProxy) {
    //         throw new Error('user op function hash for paymaster proxy not found')
    //     }
    //     const pendingDecodedCallData = decodeCallData({
    //         callData: pending.op.callData,
    //         functionHash: pending.functionHashForPaymasterProxy,
    //     })

    //     const spaceId = pending.spaceId
    //     const functionHashForPaymasterProxy = pending.functionHashForPaymasterProxy

    //     if (isBatchData(pendingDecodedCallData)) {
    //         const { toAddress, value, executeData } = pendingDecodedCallData
    //         return this.sendUserOp({
    //             toAddress,
    //             callData: executeData,
    //             signer,
    //             spaceId,
    //             functionHashForPaymasterProxy,
    //             value,
    //         })
    //     } else if (isSingleData(pendingDecodedCallData)) {
    //         const { toAddress, value, executeData } = pendingDecodedCallData
    //         return this.sendUserOp({
    //             toAddress,
    //             callData: executeData,
    //             signer,
    //             spaceId,
    //             functionHashForPaymasterProxy,
    //             value,
    //         })
    //     } else {
    //         throw new Error('mismatch in format of toAddress and callData')
    //     }
    // }

    public async sendUpgradeToAndCallOp(args: { signer: ethers.Signer }) {
        const smartAccountClient = await this.getSmartAccountClient({ signer: args.signer })
        return upgradeToAndCall({
            ...this.commonParams(),
            smartAccountClient,
            signer: args.signer,
        })
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
            smartAccount: smartAccountClient,
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
            smartAccount: smartAccountClient,
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
            smartAccount: smartAccountClient,
            newAccountImplementationType: this.newAccountImplementationType,
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
            smartAccount: smartAccountClient,
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
            smartAccount: smartAccountClient,
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
        if (Array.isArray(args.callData) && Array.isArray(args.toAddress)) {
            // TODO: trading maybe wants to use this?
            const value = Array.isArray(args.value) ? args.value : args.toAddress.map(() => 0n)
            return this.sendUserOp({
                callData: args.callData,
                toAddress: args.toAddress,
                value,
                signer: args.signer,
                spaceId: undefined,
                functionHashForPaymasterProxy: 'trading',
            })
        } else if (
            typeof args.callData === 'string' &&
            typeof args.toAddress === 'string' &&
            typeof args.value === 'bigint'
        ) {
            return this.sendUserOp({
                callData: args.callData,
                toAddress: args.toAddress,
                value: args.value,
                signer: args.signer,
                spaceId: undefined,
                functionHashForPaymasterProxy: 'trading',
            })
        }
        throw new Error('Invalid arguments')
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
