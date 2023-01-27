import { useProvider } from 'wagmi'

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
