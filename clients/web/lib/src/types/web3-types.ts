import { Address, Chain, Connector } from 'wagmi'
import { RoomIdentifier } from './room-identifier'
import { useEthersProvider } from '../hooks/Web3Context/useEthersProvider'
import { TokenEntitlementDataTypes } from '@river/web3'

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

export enum BlockchainTransactionType {
    CreateSpace = 'createSpace',
    CreateChannel = 'createChannel',
    EditChannel = 'editChannel',
    UpdateRole = 'updateRole',
    CreateRole = 'createRole',
    DeleteRole = 'deleteRole',
    UpdateSpaceName = 'updateSpaceName',
}

export type BlockchainTransaction = {
    hash: Address
    data?: {
        parentSpaceId?: string
        spaceId: RoomIdentifier
    }
    type: BlockchainTransactionType
}

export type Connectors = (args: { chains: Chain[] }) => Connector[]

// aliasing this type b/c we might change to viem and it's unclear if we're going to be removing typechain generated types
export type TokenEntitlementStruct = TokenEntitlementDataTypes.ExternalTokenStruct
