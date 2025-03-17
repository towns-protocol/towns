import { IUserOperation } from 'userop.js'
import { Environment } from 'worker-common'
import { BigNumberish } from 'ethers'
import { RpcUserOperation } from 'viem'
// see https://github.com/stackup-wallet/userop.js/blob/1d9d0e034691cd384e194c9e8b3165680a334180/src/preset/middleware/paymaster.ts
export interface VerifyingPaymasterResult {
    paymasterAndData: string
    preVerificationGas: string
    verificationGasLimit: string
    callGasLimit: string
}

export type SponsorshipRequest<entryPointVersion extends '0.6' | '0.7'> = {
    data: RpcUserOperation<entryPointVersion> & {
        townId?: string
        functionHash: (typeof FunctionHash)[keyof typeof FunctionHash]
        rootKeyAddress: string
        gasOverrides?: GasOverrides
    }
}

type Multiplier = number

export type GasOverrides = {
    callGasLimit?: BigNumberish | Multiplier
    maxFeePerGas?: BigNumberish | Multiplier
    maxPriorityFeePerGas?: BigNumberish | Multiplier
    preVerificationGas?: BigNumberish | Multiplier
    verificationGasLimit?: BigNumberish | Multiplier
}

export type TransactionLimitRequest = {
    environment: Environment
    operation: FunctionName
    rootAddress: string
    privyDid: string
    blockLookbackNum?: number
}

function isValidOperation(operation: string): operation is FunctionName {
    return Object.values(FunctionName).includes(operation as FunctionName)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isTransactionLimitRequest(obj: any): obj is TransactionLimitRequest {
    return (
        typeof obj === 'object' &&
        typeof obj.environment === 'string' &&
        typeof obj.operation === 'string' &&
        isValidOperation(obj.operation) &&
        (obj.operation === 'createSpace' ||
            obj.operation === 'createSpaceWithPrepay' ||
            obj.operation === 'joinSpace' ||
            obj.operation === 'linkWalletToRootKey' ||
            obj.operation === 'linkCallerToRootKey' ||
            obj.operation === 'removeLink') &&
        typeof obj.rootAddress === 'string' &&
        typeof obj.privyDid === 'string' &&
        (typeof obj.blockLookbackNum === 'number' || obj.blockLookbackNum === undefined)
    )
}

function isFunctionHash(operation: string): operation is FunctionHash {
    return Object.values(FunctionHash).includes(operation as FunctionHash)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function commonChecks(obj: any) {
    if (!obj || typeof obj !== 'object') {
        return false
    }
    const { data } = obj

    const townsData =
        typeof data.rootKeyAddress === 'string' &&
        typeof data.functionHash === 'string' &&
        isFunctionHash(data.functionHash)

    const commonUserOpData =
        typeof data.sender === 'string' &&
        typeof data.nonce === 'string' &&
        typeof data.callData === 'string' &&
        typeof data.callGasLimit === 'string' &&
        typeof data.verificationGasLimit === 'string' &&
        typeof data.preVerificationGas === 'string' &&
        typeof data.maxFeePerGas === 'string' &&
        typeof data.maxPriorityFeePerGas === 'string' &&
        typeof data.signature === 'string'

    return townsData && commonUserOpData
}

export function isEntrypoinV06SponsorshipRequest(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    obj: any,
): obj is SponsorshipRequest<'0.6'> {
    if (!obj || typeof obj !== 'object') {
        return false
    }
    if (!commonChecks(obj)) {
        return false
    }
    const { data } = obj
    return typeof data.initCode === 'string'
}

export function isEntrypointV07SponsorshipRequest(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    obj: any,
): obj is SponsorshipRequest<'0.7'> {
    if (!obj || typeof obj !== 'object') {
        return false
    }
    if (!commonChecks(obj)) {
        return false
    }
    const { data } = obj

    return typeof data.factory === 'string' && typeof data.factoryData === 'string'
}

export enum Overrides {
    EveryWalletCanMintWhitelistedEmail = 'every_wallet_can_mint_town_with_wl_email',
    EveryWhitelistedWalletCanLinkNWallets = 'every_wl_wallet_can_link_n_wallets',
    EveryWalletCanJoinTownOnWhitelist = 'every_wallet_can_join_town_on_wl',
    EveryWalletCanUseTownOnWhitelist = 'every_wallet_can_use_town_on_wl',
}

export enum Whitelist {
    TownIdWhitelist = 'town_id_whitelist',
    EmailWhitelist = 'email_whitelist',
    AddressWhitelist = 'address_whitelist',
}

export interface IOverrideOperation {
    operation: string
    enabled: boolean
    n?: number
}

export interface IWhitelistOperation {
    operation: string
    enabled: boolean
    data: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isOverrideOperation(obj: any): obj is IOverrideOperation {
    return (
        Object.values(Overrides).includes(obj.operation) &&
        typeof obj.enabled === 'boolean' &&
        (typeof obj.n === 'number' || obj.n === undefined)
    )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isWhitelistOperation(obj: any): obj is IWhitelistOperation {
    return (
        Object.values(Whitelist).includes(obj.operation) &&
        'data' in obj &&
        typeof obj.data === 'string' &&
        typeof obj.enabled === 'boolean'
    )
}

export function isWhitelistStoredOperation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    obj: any,
): obj is Omit<IWhitelistOperation, 'operation'> {
    return 'data' in obj && typeof obj.data === 'string' && typeof obj.enabled === 'boolean'
}

export function isHexString(input: string): input is `0x${string}` {
    return /^0x[0-9A-Fa-f]+$/.test(input)
}

type PaymasterResponse = {
    id: number | null
    jsonrpc: string
    error?: { message: string; code: number }
    result?: {
        paymasterAndData: string
        preVerificationGas: string
        verificationGasLimit: string
        callGasLimit: string
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isPaymasterResponse(obj: any): obj is PaymasterResponse {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'id' in obj &&
        (typeof obj.id === 'number' || obj.id === null) &&
        'jsonrpc' in obj &&
        typeof obj.jsonrpc === 'string' &&
        ('error' in obj || 'result' in obj)
    )
}

export const ContractName = {
    SpaceOwner: 'SpaceOwner',
    WalletLink: 'WalletLink',
    Banning: 'Banning',
    Channels: 'Channels',
    Roles: 'Roles',
    SpaceFactory: 'SpaceFactory',
    Space: 'Space',
    Prepay: 'Prepay',
    Membership: 'Membership',
} as const

export type ContractName = (typeof ContractName)[keyof typeof ContractName]

export const FunctionName = {
    createSpaceWithPrepay: 'createSpaceWithPrepay',
    createSpace: 'createSpace',
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
    setChannelPermissionOverrides: 'setChannelPermissionOverrides',
    clearChannelPermissionOverrides: 'clearChannelPermissionOverrides',
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
    // PrepayBase.sol
    prepayMembership: 'prepayMembership',
    // Membership.sol
    setMembershipLimit: 'setMembershipLimit',
    setMembershipPrice: 'setMembershipPrice',
    refreshMetadata: 'refreshMetadata',
    withdraw: 'withdraw',
} as const

export type FunctionName = (typeof FunctionName)[keyof typeof FunctionName]

export const EventName = {
    // RoleBase.sol
    RoleCreated: 'RoleCreated',
    RoleRemoved: 'RoleRemoved',
    RoleUpdated: 'RoleUpdated',
    // ChannelBase.sol
    ChannelCreated: 'ChannelCreated',
    ChannelUpdated: 'ChannelUpdated',
    ChannelRemoved: 'ChannelRemoved',
    ChannelRoleAdded: 'ChannelRoleAdded',
    ChannelRoleRemoved: 'ChannelRoleRemoved',
    // EntitlementsManagerBase.sol
    EntitlementModuleRemoved: 'EntitlementModuleRemoved',
    EntitlementModuleAdded: 'EntitlementModuleAdded',
    // SpaceOwnerBase.sol
    SpaceOwner__UpdateSpace: 'SpaceOwner__UpdateSpace',
    // WalletLink.sol
    LinkWalletToRootKey: 'LinkWalletToRootKey',
    RemoveLink: 'RemoveLink',
    // Banning.sol
    Banned: 'Banned',
    Unbanned: 'Unbanned',
    // PrepayBase.sol
    PrepayBase__Prepaid: 'PrepayBase__Prepaid',
    // Membership.sol
    MembershipLimitUpdated: 'MembershipLimitUpdated',
    MembershipPriceUpdated: 'MembershipPriceUpdated',

    Transfer: 'Transfer',
} as const

export type EventName = (typeof EventName)[keyof typeof EventName]

// TODO: different name for this
const FunctionHash = {
    ...FunctionName,
    transferTokens: 'transferTokens',
    createSpace_linkWallet: 'createSpace_linkWallet',
    joinSpace_linkWallet: 'joinSpace_linkWallet',
    editMembershipSettings: 'editMembershipSettings',
    refreshMetadata: 'refreshMetadata',
} as const

type FunctionHash = (typeof FunctionHash)[keyof typeof FunctionHash]

export const Networks = {
    local: 'local',
    base_sepolia: 'base_sepolia',
    base: 'base',
} as const

export type Networks = (typeof Networks)[keyof typeof Networks]
