import { Wallet } from 'ethers'

export interface ChatConfig {
    containerIndex: number
    processIndex: number
    clientsCount: number
    clientsPerProcess: number
    duration: number
    sessionId: string
    spaceId: string
    announceChannelId: string
    channelIds: string[]
    allWallets: Wallet[]
    localClients: {
        startIndex: number
        endIndex: number
        wallets: Wallet[]
    }
    startedAtMs: number
    waitForSpaceMembershipTimeoutMs: number
    waitForChannelDecryptionTimeoutMs: number
}
