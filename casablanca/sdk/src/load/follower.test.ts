/**
 * @group stress-test-follower
 */
import { dlog } from '@river/dlog'
import { ethers } from 'ethers'
import { makeUserContextFromWallet } from '../util.test'
import { makeStreamRpcClient } from '../makeStreamRpcClient'
import { userIdFromAddress } from '../id'
import { Client } from '../client'
import { RiverDbManager } from '../riverDbManager'
import { MockEntitlementsDelegate } from '../utils'
import { createSpaceDapp } from '@river/web3'
import {
    RiverSDK,
    startsWithSubstring,
    ChannelTownPairs,
    getRandomInt,
    ChannelTrackingInfo,
    pauseForXMiliseconds,
} from '../testSdk'
import crypto from 'crypto'
import Redis from 'ioredis'
import {
    jsonRpcProviderUrl,
    rpcClientURL,
    defaultJoinFactor,
    maxDelayBetweenMessagesPerUserMiliseconds,
    loadDurationMs,
    defaultRedisHost,
    defaultRedisPort,
} from './stressconfig.test'

const baseChainRpcUrl = process.env.BASE_CHAIN_RPC_URL
    ? process.env.BASE_CHAIN_RPC_URL
    : jsonRpcProviderUrl
const riverNodeUrl = process.env.RIVER_NODE_URL ? process.env.RIVER_NODE_URL : rpcClientURL
const joinFactor = process.env.JOIN_FACTOR ? parseInt(process.env.JOIN_FACTOR) : defaultJoinFactor
const maxMsgDelayMs = process.env.MAX_MSG_DELAY_MS
    ? parseInt(process.env.MAX_MSG_DELAY_MS)
    : maxDelayBetweenMessagesPerUserMiliseconds
const loadTestDurationMs = process.env.LOAD_TEST_DURATION_MS
    ? parseInt(process.env.LOAD_TEST_DURATION_MS)
    : loadDurationMs
const redisHost = process.env.REDIS_HOST ? process.env.REDIS_HOST : defaultRedisHost
const redisPort = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : defaultRedisPort

const log = dlog('csb:test:stress')

const redis = new Redis({
    host: redisHost, // Redis server host
    port: redisPort, // Redis server port
})

let coordinationSpaceId: string
let coordinationChannelId: string

describe('Stress test', () => {
    test(
        'stress test',
        async () => {
            const channelTownPairs = new ChannelTownPairs()
            const townsJoined = new Set<string>()
            const channelsJoined: string[] = []
            const userNumPerChannel = new Map<string, number>()
            const trackedChannels = new Set<string>()

            let canLoad = false
            //Step 1 - Create client
            const result = await createFundedTestUser()
            fundWallet(result.walletWithProvider)

            function handleEventDecrypted(client: Client) {
                // eslint-disable-next-line
                client.on('eventDecrypted', async (streamId, contentKind, event) => {
                    const clearEvent = event.decryptedContent
                    if (clearEvent.kind !== 'channelMessage') return
                    expect(clearEvent.content?.payload).toBeDefined()
                    if (
                        clearEvent.content?.payload?.case === 'post' &&
                        clearEvent.content?.payload?.value?.content?.case === 'text'
                    ) {
                        const body = clearEvent.content?.payload?.value?.content.value?.body
                        //console.log('Added message', body)
                        if (streamId === coordinationChannelId) {
                            if (startsWithSubstring(body, 'WONDERLAND')) {
                                log('WONDERLAND')
                                channelTownPairs.recoverFromJSON(body.slice(12))
                                log('channelTownPairs', channelTownPairs.getRecords())
                                //Let's join necessary channels and send back "READY" message
                                let i = 0
                                log('Start joining')
                                while (i < channelTownPairs.getRecords().length) {
                                    const townId = channelTownPairs.getRecords()[i][1]
                                    const channelId = channelTownPairs.getRecords()[i][0]
                                    if (!townsJoined.has(townId)) {
                                        log('Try joining town with Id: ', townId)
                                        await result.riverSDK.joinTown(townId)
                                        townsJoined.add(townId)
                                        log('Joined town with Id: ', townId)
                                    }
                                    log(
                                        'joining town with Id: ',
                                        townId,
                                        'and chanelId: ',
                                        channelId,
                                    )
                                    await result.riverSDK.joinChannel(channelId)
                                    result.riverSDK.sendTextMessage(
                                        coordinationChannelId,
                                        'USER JOINED CHANNEL: ' +
                                            result.walletWithProvider.address +
                                            ' : ' +
                                            channelId,
                                    )
                                    channelsJoined.push(channelId)
                                    await result.riverSDK.sendTextMessage(
                                        coordinationChannelId,
                                        'User ' +
                                            result.walletWithProvider.address +
                                            ' joined town ' +
                                            townId +
                                            ' and channel ' +
                                            channelId,
                                    )
                                    i += getRandomInt(joinFactor) + 1 // +1 is required as our random number is from [0; joinFactor) interval, so we need to be sure that each iteration will still gives a shift
                                }
                                await result.riverSDK.sendTextMessage(
                                    coordinationChannelId,
                                    'READY',
                                )
                            }
                            if (body.startsWith('START LOAD:')) {
                                log('Received start load message', body)
                                const deserializedData = JSON.parse(body.slice(12)) as []

                                const channelTrackingInfo: ChannelTrackingInfo[] =
                                    deserializedData.map((item: any) => {
                                        const channelTrackingInfoItem: {
                                            channelId: string
                                            tracked: boolean
                                            numUsersJoined: number
                                        } = item
                                        const channelTrackingInfo = new ChannelTrackingInfo(
                                            channelTrackingInfoItem.channelId,
                                        )
                                        channelTrackingInfo.setTracked(
                                            channelTrackingInfoItem.tracked,
                                        )
                                        channelTrackingInfo.setNumUsersJoined(
                                            channelTrackingInfoItem.numUsersJoined,
                                        )
                                        return channelTrackingInfo
                                    })

                                for (
                                    let channelsCounter = 0;
                                    channelsCounter < channelTrackingInfo.length;
                                    channelsCounter++
                                ) {
                                    log('channelTrackingInfo', channelTrackingInfo[channelsCounter])
                                    const a = channelTrackingInfo[channelsCounter].getChannelId()
                                    const b =
                                        channelTrackingInfo[channelsCounter].getNumUsersJoined()
                                    userNumPerChannel.set(a, b)
                                    if (channelTrackingInfo[channelsCounter].getTracked()) {
                                        trackedChannels.add(
                                            channelTrackingInfo[channelsCounter].getChannelId(),
                                        )
                                    }
                                }
                                log('filled userNumPerChannel', userNumPerChannel)
                                canLoad = true
                            }
                        } else {
                            log('Received load message', body)
                            if (body.startsWith('TEST MESSAGE AT')) {
                                //TODO: add exception handling
                                log('Decrement called for ', body)
                                if (trackedChannels.has(streamId)) {
                                    decrementAndDeleteIfZero(body)
                                }
                            }
                        }
                    }
                })
            }

            handleEventDecrypted(result.riverSDK.client)

            let joinedMainTown = false

            while (!joinedMainTown) {
                try {
                    const redisCoordinationSpaceId = await redis.get('coordinationSpaceId')
                    if (redisCoordinationSpaceId != null) {
                        coordinationSpaceId = redisCoordinationSpaceId
                    }
                    const redisCoordinationChannelId = await redis.get('coordinationChannelId')
                    if (redisCoordinationChannelId != null) {
                        coordinationChannelId = redisCoordinationChannelId
                    }

                    if (coordinationSpaceId === undefined || coordinationChannelId === undefined) {
                        log('Coordination space or channel id wasnt set')
                        throw 'Coordination space or channel id wasnt set'
                    }
                    log('Coordination space id', coordinationSpaceId)
                    log('Coordination channel id', coordinationChannelId)
                    await result.riverSDK.joinTown(coordinationSpaceId)
                    await result.riverSDK.joinChannel(coordinationChannelId)
                    joinedMainTown = true
                } catch (e) {
                    log('Cannot join town yet')
                }
                await new Promise((resolve) => setTimeout(resolve, 1000)) // Delay for 1 second
            }

            await result.riverSDK.sendTextMessage(coordinationChannelId, 'JOINED')

            while (!canLoad) {
                // Perform some actions or logic in the loop
                log('Waiting for load start signal')
                await pauseForXMiliseconds(1000) // 1 second delay
            }

            await result.riverSDK.sendTextMessage(coordinationChannelId, 'STARTING LOAD')

            const startLoadTime = Date.now()
            while (Date.now() - startLoadTime <= loadTestDurationMs) {
                // Perform some actions or logic in the loop
                const channelToSendMessage = channelsJoined[getRandomInt(channelsJoined.length)]
                const newHash = await generateRandomHash()
                const testMessageText = 'TEST MESSAGE AT ' + Date.now() + ' ' + newHash
                log('Sent message to channel', channelToSendMessage, 'with text ', testMessageText)
                let recepients = 0
                if (userNumPerChannel.has(channelToSendMessage)) {
                    const usersPerChannel = userNumPerChannel.get(channelToSendMessage)
                    if (usersPerChannel !== undefined) {
                        //TODO: fix this if statements if possible
                        recepients = usersPerChannel - 1
                    }
                }
                if (recepients > 0 && trackedChannels.has(channelToSendMessage)) {
                    redis.set(testMessageText, recepients)
                    log('redis set', testMessageText, recepients)
                }
                await result.riverSDK.sendTextMessage(channelToSendMessage, testMessageText)
                // Introduce a delay (e.g., 1 second) before the next iteration
                await pauseForXMiliseconds(getRandomInt(maxMsgDelayMs) + 1000)
            }

            await result.riverSDK.sendTextMessage(coordinationChannelId, 'LOAD OVER')

            log('Number of mismatched messages:', await redis.dbsize())
            await pauseForXMiliseconds(60000)
            let dbSize = await redis.dbsize()
            log('DB size', dbSize)
            await pauseForXMiliseconds(120000)
            dbSize = await redis.dbsize()
            log('DB size #2', dbSize)
            await result.riverSDK.client.stopSync()
            expect(dbSize).toBe(0)
            await redis.quit()
        },
        loadTestDurationMs * 10,
    )
})

async function createFundedTestUser(): Promise<{
    riverSDK: RiverSDK
    provider: ethers.providers.JsonRpcProvider
    walletWithProvider: ethers.Wallet
}> {
    const wallet = ethers.Wallet.createRandom()
    log('follower wallet:', wallet)
    // Create a new wallet
    const provider = new ethers.providers.JsonRpcProvider(baseChainRpcUrl)
    const walletWithProvider = wallet.connect(provider)

    const context = await makeUserContextFromWallet(walletWithProvider)
    log('River node url from createFundedTestUser:', riverNodeUrl)
    const rpcClient = makeStreamRpcClient(riverNodeUrl)
    const userId = userIdFromAddress(context.creatorAddress)

    const cryptoStore = RiverDbManager.getCryptoDb(userId)
    const client = new Client(context, rpcClient, cryptoStore, new MockEntitlementsDelegate())
    client.setMaxListeners(100)
    await client.initializeUser()
    client.startSync()

    const spaceDapp = createSpaceDapp({
        chainId: (await walletWithProvider.provider.getNetwork()).chainId,
        provider: walletWithProvider.provider,
    })
    const riverSDK = new RiverSDK(spaceDapp, client, walletWithProvider)
    return { riverSDK, provider, walletWithProvider }
}

async function fundWallet(walletToFund: ethers.Wallet) {
    const provider = new ethers.providers.JsonRpcProvider(baseChainRpcUrl)
    const amountInWei = ethers.BigNumber.from(10).pow(18).toHexString()
    provider.send('anvil_setBalance', [walletToFund.address, amountInWei])
    return true
}

async function generateRandomHash(): Promise<string> {
    const randomBytes = crypto.randomBytes(32)
    const randomHash = crypto.createHash('sha256').update(randomBytes).digest('hex')
    return randomHash
}

async function decrementAndDeleteIfZero(key: string): Promise<number | null> {
    log('redis update key', key)
    // Lua script to decrement and delete if the value reaches 0
    const luaScript = `
      local current = tonumber(redis.call('GET', KEYS[1]))
      if current == 1 then
        redis.call('DEL', KEYS[1])
      elseif current > 1 then
        redis.call('DECR', KEYS[1])
      end
      return current`

    try {
        // Execute the Lua script
        const result = await redis.multi().eval(luaScript, 1, key).exec()
        return result as number | null
    } catch (error) {
        log('Error:', error)
        throw error
    }
}
