import 'fake-indexeddb/auto' // used to mock indexdb in dexie, don't remove
import { check, dlogger } from '@river-build/dlog'
import { makeDefaultChannelStreamId, makeRiverConfig } from '@river/sdk'
import { generateWalletsFromSeed } from './utils/wallets'
import { exit } from 'process'
import { Wallet } from 'ethers'
import { makeStressClient } from './utils/stressClient'
import { kickoffChat } from './mode/chat/kickoffChat'
import { joinChat } from './mode/chat/joinChat'
import { updateProfile } from './mode/chat/updateProfile'
import { chitChat } from './mode/chat/chitChat'
import { sumarizeChat } from './mode/chat/sumarizeChat'
import { ChatConfig } from './mode/chat/types'

function isSet(value: string | undefined | null): value is string {
    return value !== undefined && value !== null && value.length > 0
}

check(isSet(process.env.PROCESS_INDEX), 'process.env.PROCESS_INDEX')
const startedAtMs = Date.now()
const processIndex = parseInt(process.env.PROCESS_INDEX)

const logger = dlogger(`stress:run:${processIndex}`)
const config = makeRiverConfig()

logger.log('======================= run =======================')
if (processIndex === 0) {
    logger.log('env', process.env)
    logger.log('config', {
        environmentId: config.environmentId,
        base: { rpcUrl: config.base.rpcUrl },
        river: { rpcUrl: config.river.rpcUrl },
    })
}

function getChatConfig(): ChatConfig {
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
    const clientStartIndex = processIndex * clientsPerProcess
    const clientEndIndex = clientStartIndex + clientsPerProcess
    const spaceId = process.env.SPACE_ID
    const channelIds = process.env.CHANNEL_IDS.split(',')
    const announceChannelId = process.env.ANNOUNCE_CHANNEL_ID
        ? process.env.ANNOUNCE_CHANNEL_ID
        : makeDefaultChannelStreamId(spaceId)
    const allWallets = generateWalletsFromSeed(getRootWallet().mnemonic, 0, clientsCount)
    const wallets = allWallets.slice(clientStartIndex, clientEndIndex)
    if (clientStartIndex >= clientEndIndex) {
        throw new Error('clientStartIndex >= clientEndIndex')
    }
    return {
        containerIndex,
        containerCount,
        processIndex,
        processesPerContainer,
        clientsCount,
        clientsPerProcess,
        duration,
        sessionId: getSessionId(),
        spaceId,
        announceChannelId,
        channelIds,
        allWallets,
        localClients: {
            startIndex: clientStartIndex,
            endIndex: clientEndIndex,
            wallets,
        },
        startedAtMs,
        waitForSpaceMembershipTimeoutMs: duration * 1000,
        waitForChannelDecryptionTimeoutMs: duration * 1000,
    }
}

function getRootWallet(): { wallet: Wallet; mnemonic: string } {
    check(isSet(process.env.MNEMONIC), 'process.env.MNEMONIC')
    const mnemonic = process.env.MNEMONIC
    const wallet = Wallet.fromMnemonic(mnemonic)
    return { wallet, mnemonic }
}

function getStressDuration(): number {
    check(isSet(process.env.STRESS_DURATION), 'process.env.STRESS_DURATION')
    return parseInt(process.env.STRESS_DURATION)
}

function getStressMode(): string {
    check(isSet(process.env.STRESS_MODE), 'process.env.STRESS_MODE')
    return process.env.STRESS_MODE
}

function getSessionId(): string {
    check(isSet(process.env.SESSION_ID), 'process.env.SESSION_ID')
    check(process.env.SESSION_ID.length > 0, 'process.env.SESSION_ID.length > 0')
    return process.env.SESSION_ID
}

/*
 * Starts a chat stress test.
 * This test generates a range of wallets from a seed phrase and logs the addresses.
 * loop over wallets one by one
 */
async function startStressChat() {
    logger.log('startStressChat')
    const chatConfig = getChatConfig()
    logger.log('make clients')
    const clients = await Promise.all(
        chatConfig.localClients.wallets.map((wallet, i) =>
            makeStressClient(config, chatConfig.localClients.startIndex + i, wallet),
        ),
    )

    check(
        clients.length === chatConfig.clientsPerProcess,
        `clients.length !== chatConfig.clientsPerProcess ${clients.length} !== ${chatConfig.clientsPerProcess}`,
    )

    if (chatConfig.processIndex === 0) {
        await kickoffChat(clients[0], chatConfig)
    }

    logger.log('kickoffChat')
    await Promise.all(clients.map((client) => joinChat(client, chatConfig)))

    logger.log('updateProfile')
    await Promise.all(clients.map((client) => updateProfile(client, chatConfig)))

    logger.log('chitChat')
    await Promise.all(clients.map((client) => chitChat(client, chatConfig)))

    logger.log('sumarizeChat')
    await sumarizeChat(clients[0], chatConfig)

    logger.log('done')
}

async function setupChat() {
    logger.log('setupChat')
    const client = await makeStressClient(config, 0, getRootWallet().wallet)
    // make a space
    const { spaceId } = await client.createSpace('stress test space')
    // make an announce channel
    const announceChannelId = await client.createChannel(spaceId, 'stress anouncements')
    // make two channels
    const stress1Channelid = await client.createChannel(spaceId, 'stress1')
    const stress2Channelid = await client.createChannel(spaceId, 'stress2')
    // log all the deets
    logger.log(
        `SPACE_ID=${spaceId} ANNOUNCE_CHANNEL_ID=${announceChannelId} CHANNEL_IDS=${stress1Channelid},${stress2Channelid}`,
    )
    logger.log('join at', `http://localhost:3000/t/${spaceId}/?invite`)
    logger.log('or', `http://localhost:3001/spaces/${spaceId}/?invite`)
    logger.log('done')
}

switch (getStressMode()) {
    case 'chat':
        await startStressChat()
        break
    case 'setup_chat':
        await setupChat()
        break
    default:
        throw new Error('unknown stress mode')
}

exit(0)
