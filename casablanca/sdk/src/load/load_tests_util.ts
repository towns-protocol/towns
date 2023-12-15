import { makeUserContextFromWallet } from '../util.test'
import { ethers } from 'ethers'
import { makeStreamRpcClient } from '../makeStreamRpcClient'
import { userIdFromAddress } from '../id'
import { Client } from '../client'
import { RiverSDK } from '../testSdk'
import { RiverDbManager } from '../riverDbManager'
import { MockEntitlementsDelegate } from '../utils'
import { createSpaceDapp } from '@river/web3'

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
