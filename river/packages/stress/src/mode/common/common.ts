import { check } from '@river-build/dlog'
import { isSet } from '../../utils/expect'
import { ChatConfig } from './types'
import { makeDefaultChannelStreamId } from '@river-build/sdk'
import { generateWalletsFromSeed } from '../../utils/wallets'
import { Wallet } from 'ethers'
import { RedisStorage } from '../../utils/storage'

export const probability = (p: number) => Math.random() < p

function getStressDuration(): number {
    check(isSet(process.env.STRESS_DURATION), 'process.env.STRESS_DURATION')
    return parseInt(process.env.STRESS_DURATION)
}

function getSessionId(): string {
    check(isSet(process.env.SESSION_ID), 'process.env.SESSION_ID')
    check(process.env.SESSION_ID.length > 0, 'process.env.SESSION_ID.length > 0')
    return process.env.SESSION_ID
}

export function getChatConfig(opts: { processIndex: number; rootWallet: Wallet }): ChatConfig {
    const startedAtMs = Date.now()
    check(isSet(process.env.CLIENTS_PER_PROCESS), 'process.env.CLIENTS_PER_PROCESS')
    check(isSet(process.env.CLIENTS_COUNT), 'process.env.CLIENTS_COUNT')
    check(isSet(process.env.SPACE_ID), 'process.env.SPACE_ID')
    check(isSet(process.env.CHANNEL_IDS), 'process.env.CHANNEL_IDS')
    check(isSet(process.env.CONTAINER_INDEX), 'process.env.CONTAINER_INDEX')
    check(isSet(process.env.CONTAINER_COUNT), 'process.env.CONTAINER_COUNT')
    check(isSet(process.env.PROCESSES_PER_CONTAINER), 'process.env.PROCESSES_PER_CONTAINER')
    const duration = getStressDuration()
    const containerIndex = parseInt(process.env.CONTAINER_INDEX)
    const containerCount = parseInt(process.env.CONTAINER_COUNT)
    const processesPerContainer = parseInt(process.env.PROCESSES_PER_CONTAINER)
    const clientsCount = parseInt(process.env.CLIENTS_COUNT)
    const clientsPerProcess = parseInt(process.env.CLIENTS_PER_PROCESS)
    const clientStartIndex = opts.processIndex * clientsPerProcess
    const clientEndIndex = clientStartIndex + clientsPerProcess
    const spaceId = process.env.SPACE_ID
    const channelIds = process.env.CHANNEL_IDS.split(',')
    const announceChannelId =
        process.env.ANNOUNCE_CHANNEL_ID && process.env.ANNOUNCE_CHANNEL_ID.length > 0
            ? process.env.ANNOUNCE_CHANNEL_ID
            : makeDefaultChannelStreamId(spaceId)

    const allWallets = generateWalletsFromSeed(opts.rootWallet.mnemonic.phrase, 0, clientsCount)
    const wallets = allWallets.slice(clientStartIndex, clientEndIndex)
    const randomClientsCount = process.env.RANDOM_CLIENTS_COUNT
        ? parseInt(process.env.RANDOM_CLIENTS_COUNT)
        : 0
    const storage = process.env.REDIS_HOST ? new RedisStorage(process.env.REDIS_HOST) : undefined
    if (clientStartIndex >= clientEndIndex) {
        throw new Error('clientStartIndex >= clientEndIndex')
    }
    const gdmProbability = process.env.GDM_PROBABILITY
        ? parseFloat(process.env.GDM_PROBABILITY)
        : 0.2
    const averageWaitTimeout = (1000 * clientsCount * 2) / channelIds.length
    return {
        kickoffMessageEventId: undefined,
        countClientsMessageEventId: undefined,
        containerIndex,
        containerCount,
        processIndex: opts.processIndex,
        processesPerContainer,
        clientsCount,
        clientsPerProcess,
        duration,
        sessionId: getSessionId(),
        spaceId,
        announceChannelId,
        channelIds,
        allWallets,
        randomClientsCount,
        randomClients: [],
        localClients: {
            startIndex: clientStartIndex,
            endIndex: clientEndIndex,
            wallets,
        },
        startedAtMs,
        waitForSpaceMembershipTimeoutMs: Math.max(duration * 1000, 20000),
        waitForChannelDecryptionTimeoutMs: Math.max(duration * 1000, 20000),
        globalPersistedStore: storage,
        gdmProbability,
        averageWaitTimeout,
    } satisfies ChatConfig
}
