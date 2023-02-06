import { Address, useProvider } from 'wagmi'
import { RoomIdentifier } from './room-identifier'

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

export type TProvider = ReturnType<typeof useProvider>

export enum BlockchainTransactionType {
    CreateSpace = 'createSpace',
    CreateChannel = 'createChannel',
}

export type BlockchainTransaction = {
    hash: Address
    data?: {
        parentSpaceId?: string
        spaceId: RoomIdentifier
    }
    type: BlockchainTransactionType
}
