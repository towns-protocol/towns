import { IUserOperation } from 'userop.js'
import { Environment } from 'worker-common'

// see https://github.com/stackup-wallet/userop.js/blob/1d9d0e034691cd384e194c9e8b3165680a334180/src/preset/middleware/paymaster.ts
export interface VerifyingPaymasterResult {
    paymasterAndData: string
    preVerificationGas: string
    verificationGasLimit: string
    callGasLimit: string
}

export type TownsUserOperation = IUserOperation & {
    townId?: string
    functionHash: (typeof FunctionHash)[keyof typeof FunctionHash]
    rootKeyAddress: string
}

export type TransactionLimitRequest = {
    environment: Environment
    operation: FunctionName
    rootAddress: string
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
            obj.operation === 'joinSpace' ||
            obj.operation === 'linkWalletToRootKey' ||
            obj.operation === 'linkCallerToRootKey' ||
            obj.operation === 'removeLink') &&
        typeof obj.rootAddress === 'string' &&
        (typeof obj.blockLookbackNum === 'number' || obj.blockLookbackNum === undefined)
    )
}

function isFunctionHash(operation: string): operation is FunctionHash {
    return Object.values(FunctionHash).includes(operation as FunctionHash)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isTownsUserOperation(obj: any): obj is TownsUserOperation {
    return (
        typeof obj === 'object' &&
        typeof obj.rootKeyAddress === 'string' &&
        typeof obj.sender === 'string' &&
        typeof obj.nonce === 'string' &&
        typeof obj.initCode === 'string' &&
        typeof obj.callData === 'string' &&
        typeof obj.callGasLimit === 'string' &&
        typeof obj.verificationGasLimit === 'string' &&
        typeof obj.preVerificationGas === 'string' &&
        typeof obj.maxFeePerGas === 'string' &&
        typeof obj.maxPriorityFeePerGas === 'string' &&
        typeof obj.paymasterAndData === 'string' &&
        typeof obj.signature === 'string' &&
        typeof obj.functionHash === 'string' &&
        isFunctionHash(obj.functionHash)
    )
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

export type pmSponsorUserOperationResponse = {
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
export function isPmSponsorUserOperationResponse(obj: any): obj is pmSponsorUserOperationResponse {
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
} as const

export type ContractName = (typeof ContractName)[keyof typeof ContractName]

export const FunctionName = {
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

    Transfer: 'Transfer',
} as const

export type EventName = (typeof EventName)[keyof typeof EventName]

// TODO: different name for this
const FunctionHash = {
    ...FunctionName,
    createSpace_linkWallet: 'createSpace_linkWallet',
    joinSpace_linkWallet: 'joinSpace_linkWallet',
} as const

type FunctionHash = (typeof FunctionHash)[keyof typeof FunctionHash]
