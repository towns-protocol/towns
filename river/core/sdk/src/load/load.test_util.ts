import { makeUserContextFromWallet } from '../util.test'
import { BigNumber, ethers } from 'ethers'
import { makeStreamRpcClient } from '../makeStreamRpcClient'
import { userIdFromAddress } from '../id'
import { Client } from '../client'
import { RiverSDK } from '../testSdk.test_util'
import { RiverDbManager } from '../riverDbManager'
import { MockEntitlementsDelegate } from '../utils'
import { ISpaceDapp, createSpaceDapp } from '@river-build/web3'
import { dlog } from '@river-build/dlog'
import { minimalBalance } from './loadconfig.test_util'
import { makeBaseChainConfig } from '../riverConfig'

const log = dlog('csb:test:loadTests')

type ClientWalletInfo = {
    client: Client
    etherWallet: ethers.Wallet
    provider: ethers.providers.JsonRpcProvider
    walletWithProvider: ethers.Wallet
}

export type ClientWalletRecord = Record<string, ClientWalletInfo>

export async function createAndStartClient(
    account: {
        address: string
        privateKey: string
    },
    jsonRpcProviderUrl: string,
    nodeRpcURL: string,
): Promise<ClientWalletInfo> {
    const wallet = new ethers.Wallet(account.privateKey)
    const provider = new ethers.providers.JsonRpcProvider(jsonRpcProviderUrl)
    const walletWithProvider = wallet.connect(provider)

    const context = await makeUserContextFromWallet(wallet)

    const rpcClient = makeStreamRpcClient(nodeRpcURL)
    const userId = userIdFromAddress(context.creatorAddress)

    const cryptoStore = RiverDbManager.getCryptoDb(userId)
    const client = new Client(context, rpcClient, cryptoStore, new MockEntitlementsDelegate())
    client.setMaxListeners(100)
    await client.initializeUser()
    client.startSync()
    return {
        client: client,
        etherWallet: wallet,
        provider: provider,
        walletWithProvider: walletWithProvider,
    }
}

export async function createAndStartClients(
    accounts: Array<{
        address: string
        privateKey: string
    }>,
    jsonRpcProviderUrl: string,
    nodeRpcURL: string,
): Promise<ClientWalletRecord> {
    const clientPromises = accounts.map(
        async (account, index): Promise<[string, ClientWalletInfo]> => {
            const clientName = `client_${index}`
            const clientWalletInfo = await createAndStartClient(
                account,
                jsonRpcProviderUrl,
                nodeRpcURL,
            )
            return [clientName, clientWalletInfo]
        },
    )

    const clientArray = await Promise.all(clientPromises)
    return clientArray.reduce((records: ClientWalletRecord, [clientName, clientInfo]) => {
        records[clientName] = clientInfo
        return records
    }, {})
}

export async function multipleClientsJoinSpaceAndChannel(
    clientWalletInfos: ClientWalletRecord,
    spaceId: string,
    channelId: string | undefined,
): Promise<void> {
    const baseConfig = makeBaseChainConfig()
    const clientPromises = Object.keys(clientWalletInfos).map(async (key) => {
        const clientWalletInfo = clientWalletInfos[key]
        const provider = clientWalletInfo.provider
        const walletWithProvider = clientWalletInfo.walletWithProvider
        const client = clientWalletInfo.client
        const spaceDapp = createSpaceDapp(provider, baseConfig.chainConfig)
        const riverSDK = new RiverSDK(spaceDapp, client, walletWithProvider)
        await riverSDK.joinSpace(spaceId)
        if (channelId) {
            await riverSDK.joinChannel(channelId)
        }
    })

    await Promise.all(clientPromises)
}

export type ClientSpaceChannelInfo = {
    client: Client
    spaceDapp: ISpaceDapp
    spaceId: string
    channelId: string
}

export async function createClientSpaceAndChannel(
    account: {
        address: string
        privateKey: string
    },
    jsonRpcProviderUrl: string,
    nodeRpcURL: string,
    createExtraChannel: boolean = false,
): Promise<ClientSpaceChannelInfo> {
    const baseConfig = makeBaseChainConfig()
    const clientWalletInfo = await createAndStartClient(account, jsonRpcProviderUrl, nodeRpcURL)
    const client = clientWalletInfo.client
    const provider = clientWalletInfo.provider
    const walletWithProvider = clientWalletInfo.walletWithProvider
    const spaceDapp = createSpaceDapp(provider, baseConfig.chainConfig)

    const balance = await walletWithProvider.getBalance()
    const minimalWeiValue = BigNumber.from(BigInt(Math.floor(minimalBalance * 1e18)))
    log(`balanceInETH<${walletWithProvider.address}>`, ethers.utils.formatEther(balance))
    expect(balance.gte(minimalWeiValue)).toBeTruthy()

    const riverSDK = new RiverSDK(spaceDapp, client, walletWithProvider)

    // create space
    const createTownReturnVal = await riverSDK.createSpaceWithDefaultChannel('load-tests', '')
    const spaceStreamId = createTownReturnVal.spaceStreamId

    const spaceId = spaceStreamId
    let channelId = createTownReturnVal.defaultChannelStreamId

    if (createExtraChannel) {
        // create channel
        const channelStreamId = await riverSDK.createChannel(
            spaceStreamId,
            'load-tests',
            'load-tests topic',
        )
        channelId = channelStreamId
    }

    return {
        client: client,
        spaceDapp: spaceDapp,
        spaceId: spaceId,
        channelId: channelId,
    }
}

export const startMessageSendingWindow = (
    contentKind: string,
    windowIndex: number,
    clients: Client[],
    channelId: string,
    messagesSentPerUserMap: Map<string, Set<string>>,
    windownDuration: number,
): void => {
    const recipients = clients.map((client) => client.userId)
    for (let i = 0; i < clients.length; i++) {
        const senderClient = clients[i]
        sendMessageAfterRandomDelay(
            contentKind,
            senderClient,
            recipients,
            channelId,
            windowIndex.toString(),
            messagesSentPerUserMap,
            windownDuration,
        )
    }
}

export const sendMessageAfterRandomDelay = (
    contentKind: string,
    senderClient: Client,
    recipients: string[],
    channelId: string,
    windowIndex: string,
    messagesSentPerUserMap: Map<string, Set<string>>,
    windownDuration: number,
): void => {
    const randomDelay: number = Math.random() * windownDuration
    setTimeout(() => {
        void sendMessageAsync(
            contentKind,
            senderClient,
            recipients,
            channelId,
            windowIndex,
            messagesSentPerUserMap,
            randomDelay,
        )
    }, randomDelay)
}

const sendMessageAsync = async (
    contentKind: string,
    senderClient: Client,
    recipients: string[],
    streamId: string,
    windowIndex: string,
    messagesSentPerUserMap: Map<string, Set<string>>,
    randomDelay: number,
) => {
    const randomDelayInSec = (randomDelay / 1000).toFixed(3)
    const prefix = `${streamId}:${Date.now()}`
    // streamId:startTimestamp:messageBody
    const newMessage = `${prefix}:Message<${contentKind}> from client<${
        senderClient.userId
    }>, window<${windowIndex}>, ${getCurrentTime()} with delay ${randomDelayInSec}s`

    for (const recipientUserId of recipients) {
        if (recipientUserId === senderClient.userId) {
            continue
        }
        const userStreamKey = getUserStreamKey(recipientUserId, streamId)
        let messagesSet = messagesSentPerUserMap.get(userStreamKey)
        if (!messagesSet) {
            messagesSet = new Set()
            messagesSentPerUserMap.set(userStreamKey, messagesSet)
        }
        messagesSet.add(newMessage)
    }

    await senderClient.sendMessage(streamId, newMessage)
}

export function getCurrentTime(): string {
    const currentDate = new Date()
    const isoFormattedTime = currentDate.toISOString()
    return isoFormattedTime
}

export function wait(durationMS: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, durationMS)
    })
}

export function getUserStreamKey(userId: string, streamId: string): string {
    return `${userId}_${streamId}`
}

// inputString starts with 'streamId:startTimestamp:messageBody'
export function extractComponents(inputString: string): {
    streamId: string
    startTimestamp: number
    messageBody: string
} {
    const firstColon = inputString.indexOf(':')
    const secondColon = inputString.indexOf(':', firstColon + 1)

    if (firstColon === -1 || secondColon === -1) {
        throw new Error('Invalid input format')
    }

    const streamId = inputString.substring(0, firstColon)
    const startTimestampStr = inputString.substring(firstColon + 1, secondColon)
    const startTimestamp = Number(startTimestampStr)
    const messageBody = inputString.substring(secondColon + 1, secondColon)

    return { streamId, startTimestamp, messageBody }
}

export function getRandomElement<T>(arr: T[]): T | undefined {
    if (arr.length === 0) {
        return undefined
    }
    const randomIndex = Math.floor(Math.random() * arr.length)
    return arr[randomIndex]
}

export function getRandomSubset<T>(arr: T[], subsetSize: number): T[] {
    if (arr.length === 0 || subsetSize <= 0) {
        return []
    }

    if (subsetSize >= arr.length) {
        return [...arr]
    }

    const shuffled = arr.slice()
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    return shuffled.slice(0, subsetSize)
}
