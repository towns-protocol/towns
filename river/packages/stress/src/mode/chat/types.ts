import { Wallet } from 'ethers'
import { StressClient } from '../../utils/stressClient'

export interface ChatConfig {
    containerIndex: number
    containerCount: number
    processIndex: number
    processesPerContainer: number
    clientsCount: number
    clientsPerProcess: number
    duration: number
    sessionId: string
    spaceId: string
    announceChannelId: string
    kickoffMessageEventId: string | undefined
    countClientsMessageEventId: string | undefined
    channelIds: string[]
    allWallets: Wallet[]
    randomClientsCount: number
    randomClients: StressClient[]
    localClients: {
        startIndex: number
        endIndex: number
        wallets: Wallet[]
    }
    startedAtMs: number
    waitForSpaceMembershipTimeoutMs: number
    waitForChannelDecryptionTimeoutMs: number
}
