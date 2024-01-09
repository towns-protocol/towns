import { IUserOperation } from 'userop.js'

// see https://github.com/stackup-wallet/userop.js/blob/1d9d0e034691cd384e194c9e8b3165680a334180/src/preset/middleware/paymaster.ts
export interface VerifyingPaymasterResult {
    paymasterAndData: string
    preVerificationGas: string
    verificationGasLimit: string
    callGasLimit: string
}

export type TownsUserOperation = IUserOperation & { townId?: string; functionHash: string }

export type TransactionLimitRequest = {
    environment: string
    operation: string // createTown || joinTown || linkWallet || useTown
    rootAddress: string
    blockLookbackNum?: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isTransactionLimitRequest(obj: any): obj is TransactionLimitRequest {
    return (
        typeof obj === 'object' &&
        typeof obj.environment === 'string' &&
        typeof obj.operation === 'string' &&
        (obj.operation === 'createTown' ||
            obj.operation === 'joinTown' ||
            obj.operation === 'linkWallet' ||
            obj.operation === 'useTown') &&
        typeof obj.rootAddress === 'string' &&
        (typeof obj.blockLookbackNum === 'number' || obj.blockLookbackNum === undefined)
    )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isTownsUserOperation(obj: any): obj is TownsUserOperation {
    return (
        typeof obj === 'object' &&
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
        typeof obj.functionHash === 'string'
    )
}

export enum Overrides {
    EveryWalletCanMintWhitelistedEmail = 'every_wallet_can_mint_town_with_wl_email',
    EveryWalletCanLinkNWallets = 'every_wallet_can_link_n_wallets',
    EveryWalletCanJoinTownOnWhitelist = 'every_wallet_can_join_town_on_wl',
}

export enum Whitelist {
    TownIdWhitelist = 'town_id_whitelist',
    EmailWhitelist = 'email_whitelist',
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
