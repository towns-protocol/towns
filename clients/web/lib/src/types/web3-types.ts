import { Chain, Connector } from 'wagmi'
import { useEthersProvider } from '../hooks/Web3Context/useEthersProvider'
import {
    TokenEntitlementDataTypes,
    RoleEntitlements as R_RoleEntitlements,
    RoleDetails as R_RoleDetails,
    ISpaceDapp as R_ISpaceDapp,
} from '@river/web3'
import { ContractReceipt, ContractTransaction, Signer } from 'ethers'
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
    name: string
    spaceNetworkId: string
}

export type TProvider = ReturnType<typeof useEthersProvider>
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
        spaceStreamId?: string
        channeStreamId?: string
    }
    type: BlockchainTransactionType
}

export type Connectors = (args: { chains: Chain[] }) => Connector[]

// aliasing this type b/c we might change to viem and it's unclear if we're going to be removing typechain generated types
export type TokenEntitlementStruct = TokenEntitlementDataTypes.ExternalTokenStruct

// versioned types for easier reference/upgrade
export type RoleEntitlements = R_RoleEntitlements
export type RoleDetails = R_RoleDetails
export type ISpaceDapp = R_ISpaceDapp
export type ReceiptType = ContractReceipt

export type TransactionOrUserOperation = ContractTransaction | ISendUserOperationResponse
