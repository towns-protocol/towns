import { makeUserContextFromWallet } from '../util.test'
import { ethers } from 'ethers'
import { makeStreamRpcClient } from '../makeStreamRpcClient'
import { userIdFromAddress } from '../id'
import { Client } from '../client'
import { RiverSDK } from '../testSdk'
import { RiverDbManager } from '../riverDbManager'
import { MockEntitlementsDelegate } from '../utils'
import { ISpaceDapp, createSpaceDapp } from '@river/web3'

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
    await client.startSync()
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
    const clientPromises = Object.keys(clientWalletInfos).map(async (key) => {
        const clientWalletInfo = clientWalletInfos[key]

        const provider = clientWalletInfo.provider
        const walletWithProvider = clientWalletInfo.walletWithProvider
        const client = clientWalletInfo.client
        const network = await provider.getNetwork()
        const chainId = network.chainId
        const spaceDapp = createSpaceDapp(chainId, provider)
        const riverSDK = new RiverSDK(spaceDapp, client, walletWithProvider)
        await riverSDK.joinTown(spaceId)
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
): Promise<ClientSpaceChannelInfo> {
    const clientWalletInfo = await createAndStartClient(account, jsonRpcProviderUrl, nodeRpcURL)
    const client = clientWalletInfo.client
    const provider = clientWalletInfo.provider
    const walletWithProvider = clientWalletInfo.walletWithProvider
    const network = await provider.getNetwork()
    const chainId = network.chainId
    const spaceDapp = createSpaceDapp(chainId, provider)

    const balance = await walletWithProvider.getBalance()
    const minBalanceRequired = ethers.utils.parseEther('0.01')
    expect(balance.gte(minBalanceRequired)).toBe(true)
    const riverSDK = new RiverSDK(spaceDapp, client, walletWithProvider)

    // create space
    const createTownReturnVal = await riverSDK.createTownWithDefaultChannel('load-tests', '')
    const spaceStreamId = createTownReturnVal.spaceStreamId

    // create channel
    const channelStreamId = await riverSDK.createChannel(
        spaceStreamId,
        'load-tests',
        'load-tests topic',
    )

    const spaceId = spaceStreamId
    const channelId = channelStreamId

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
    for (let i = 0; i < clients.length; i++) {
        const client = clients[i]
        const recipients = getRecipients(client.userId, clients)
        sendMessageAfterRandomDelay(
            contentKind,
            client,
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
    client: Client,
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
            client,
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
    client: Client,
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
        client.userId
    }>, window<${windowIndex}>, ${getCurrentTime()} with delay ${randomDelayInSec}s`

    for (const recipientUserId of recipients) {
        const userStreamKey = getUserStreamKey(recipientUserId, streamId)
        let messagesSet = messagesSentPerUserMap.get(userStreamKey)
        if (!messagesSet) {
            messagesSet = new Set()
            messagesSentPerUserMap.set(userStreamKey, messagesSet)
        }
        messagesSet.add(newMessage)
    }

    await client.sendMessage(streamId, newMessage)
}

export function getRecipients(excludedUserId: string, clients: Client[]): string[] {
    return clients
        .filter((client) => client.userId !== excludedUserId)
        .map((client) => client.userId)
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
