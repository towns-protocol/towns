import { BaseChainConfig, SpaceDapp } from '@river-build/web3'
import { BigNumberish, Signer, BytesLike } from 'ethers'

export type AccountAbstractionConfig = Omit<UserOpsConfig, 'chainId' | 'provider' | 'config'>

export type UserOpsConfig = {
    provider: SpaceDapp['provider']
    config: BaseChainConfig
    /**
     * Node RPC url for user operations
     */
    aaRpcUrl: string
    /**
     * Optionally route bundler RPC methods to this endpoint. If the bundler and node RPC methods do not share the same rpcUrl, you must provide this. (i.e. local dev, or different node provider than bundler provider)
     * https://docs.stackup.sh/docs/useropjs-provider#bundlerjsonrpcprovider
     */
    bundlerUrl?: string
    /**
     * Send userops to paymaster proxy for verification. Omitting this requires users to fund their AA wallet with gas.
     */
    paymasterProxyUrl?: string
    entryPointAddress?: string
    factoryAddress?: string
    paymasterProxyAuthSecret?: string
    fetchAccessTokenFn: (() => Promise<string | null>) | undefined
}

export type UserOpParams = {
    value?: BigNumberish
    signer: Signer
} & (ExecuteSingleData | ExecuteBatchData)

type ExecuteSingleData = {
    toAddress?: string
    callData?: BytesLike
}

type ExecuteBatchData = {
    toAddress?: string[]
    callData?: BytesLike[]
}

export const FunctionHash = {
    // createSpace
    createSpace: 'createSpace',
    createSpaceWithPrepay: 'createSpaceWithPrepay',
    //
    removeLink: 'removeLink',
    joinSpace: 'joinSpace',
    linkCallerToRootKey: 'linkCallerToRootKey',
    // RoleBase.sol
    createRole: 'createRole',
    removeRole: 'removeRole',
    updateRole: 'updateRole',
    // ChannelBase.sol
    createChannel: 'createChannel',
    createChannelWithOverridePermissions: 'createChannelWithOverridePermissions',
    updateChannel: 'updateChannel',
    removeChannel: 'removeChannel',
    addRoleToChannel: 'addRoleToChannel',
    removeRoleFromChannel: 'removeRoleFromChannel',
    // EntitlementsManagerBase.sol
    removeEntitlementModule: 'removeEntitlementModule',
    addEntitlementModule: 'addEntitlementModule',
    // SpaceOwnerBase.sol
    updateSpaceInfo: 'updateSpaceInfo',
    // WalletLink.sol
    linkWalletToRootKey: 'linkWalletToRootKey',
    // Banning.sol
    ban: 'ban',
    unban: 'unban',
    createSpace_linkWallet: 'createSpace_linkWallet',
    joinSpace_linkWallet: 'joinSpace_linkWallet',
    prepayMembership: 'prepayMembership',
    editMembershipSettings: 'editMembershipSettings',
    setChannelPermissionOverrides: 'setChannelPermissionOverrides',
    clearChannelPermissionOverrides: 'clearChannelPermissionOverrides',
    unsupported: 'unsupported',
    transferTokens: 'transferTokens',
    transferEth: 'transferEth',
    refreshMetadata: 'refreshMetadata',
    withdraw: 'withdraw',
    // ITipping.sol
    tip: 'tip',
    checkIn: 'checkIn',
} as const

export type FunctionHash = keyof typeof FunctionHash

export const TimeTrackerEvents = {
    CREATE_SPACE: 'CREATE_SPACE',
    JOIN_SPACE: 'JOIN_SPACE',
} as const

export type TimeTrackerEvents = keyof typeof TimeTrackerEvents

export type TimeTracker = {
    startMeasurement: (
        sequence: TimeTrackerEvents,
        step: string,
    ) => ((data?: Record<string, unknown>) => void) | undefined
    endMeasurement: (sequence: string, step: string, data?: Record<string, unknown>) => void
}

export type GasEstimate = {
    preVerificationGas: BigNumberish
    verificationGasLimit: BigNumberish
    callGasLimit: BigNumberish

    // TODO: remove this with EntryPoint v0.7
    verificationGas: BigNumberish
}

export enum PaymasterErrorCode {
    PAYMASTER_LIMIT_REACHED = 'PAYMASTER_LIMIT_REACHED',
    DAILY_LIMIT_REACHED = 'DAILY_LIMIT_REACHED',
}

export type RetryType = 'gasTooLow' | 'replacementUnderpriced'
