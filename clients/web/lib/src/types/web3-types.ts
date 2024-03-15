import {
    RoleEntitlements as R_RoleEntitlements,
    RoleDetails as R_RoleDetails,
    ISpaceDapp as R_ISpaceDapp,
} from '@river/web3'
import { ContractReceipt, ContractTransaction, Signer, providers } from 'ethers'
import { ISendUserOperationResponse } from 'userop.js'

// TODO: replace instances of wagmi/viem Address with this type
export type Address = `0x${string}`

export const NULL_ADDRESS: Address = '0x0000000000000000000000000000000000000000'

export function isNullAddress(address: Address | undefined): boolean {
    return address === undefined || address === NULL_ADDRESS
}

export enum WalletStatus {
    Connected = 'connected',
    Reconnecting = 'reconnecting',
    Connecting = 'connecting',
    Disconnected = 'disconnected',
}
export interface RoleIdentifier {
    roleId: number
    spaceNetworkId: string
}

export type TProvider = providers.StaticJsonRpcProvider
export type TSigner = Signer

export enum BlockchainTransactionType {
    CreateSpace = 'createSpace',
    CreateChannel = 'createChannel',
    EditChannel = 'editChannel',
    UpdateRole = 'updateRole',
    CreateRole = 'createRole',
    DeleteRole = 'deleteRole',
    UpdateSpaceName = 'updateSpaceName',
    LinkWallet = 'linkWallet',
    UnlinkWallet = 'unlinkWallet',
}

export type BlockchainTransaction = {
    hashOrUserOpHash: Address
    transaction: TransactionOrUserOperation
    data?: {
        [x: string]: unknown
        spaceStreamId?: string
        channeStreamId?: string
    }
    type: BlockchainTransactionType
}

// versioned types for easier reference/upgrade
export type RoleEntitlements = R_RoleEntitlements
export type RoleDetails = R_RoleDetails
export type ISpaceDapp = R_ISpaceDapp
export type ReceiptType = ContractReceipt

export type TransactionOrUserOperation = ContractTransaction | ISendUserOperationResponse

export interface IChainConfig {
    chainId: number
    name?: string
    rpcUrl: string
    provider?: TProvider
}

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
export function isIChainConfig(obj: any): obj is IChainConfig {
    return (
        obj &&
        typeof obj === 'object' &&
        typeof obj.chainId === 'number' &&
        (obj.name === undefined || typeof obj.name == 'string') &&
        typeof obj.rpcUrl === 'string' &&
        (obj.provider === undefined || typeof obj.provider === 'object') // Adjust this line as necessary based on the actual type of TProvider
    )
    /* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
}
