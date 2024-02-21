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
    defaultHeapDumpCounter,
    defaultHeapDumpFirstSnapshoMs,
    defaultHeapDumpIntervalMs,
    defaultNumberOfClientsPerProcess,
} from './stressconfig'

//import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as v8 from 'v8'

const baseChainRpcUrl = process.env.BASE_CHAIN_RPC_URL
    ? process.env.BASE_CHAIN_RPC_URL
    : jsonRpcProviderUrl
const riverNodeUrl = process.env.RIVER_NODE_URL ? process.env.RIVER_NODE_URL : rpcClientURL
const joinFactor = process.env.JOIN_FACTOR ? parseInt(process.env.JOIN_FACTOR) : defaultJoinFactor
const numberOfClientsPerProcess = process.env.NUM_CLIENTS_PER_PROCESS
    ? parseInt(process.env.NUM_CLIENTS_PER_PROCESS)
    : defaultNumberOfClientsPerProcess
const maxMsgDelayMs = process.env.MAX_MSG_DELAY_MS
    ? parseInt(process.env.MAX_MSG_DELAY_MS)
    : maxDelayBetweenMessagesPerUserMiliseconds
const loadTestDurationMs = process.env.LOAD_TEST_DURATION_MS
    ? parseInt(process.env.LOAD_TEST_DURATION_MS)
    : loadDurationMs
const redisHost = process.env.REDIS_HOST ? process.env.REDIS_HOST : defaultRedisHost
const redisPort = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : defaultRedisPort
const heapDumpCounter = process.env.HEAP_DUMP_COUNTER
    ? parseInt(process.env.HEAP_DUMP_COUNTER)
    : defaultHeapDumpCounter
const heapDumpFirstSnapshoMs = process.env.HEAP_DUMP_FIRST_SNAPSHOT_MS
    ? parseInt(process.env.HEAP_DUMP_FIRST_SNAPSHOT_MS)
    : defaultHeapDumpFirstSnapshoMs
const heapDumpIntervalMs = process.env.HEAP_DUMP_INTERVAL_MS
    ? parseInt(process.env.HEAP_DUMP_INTERVAL_MS)
    : defaultHeapDumpIntervalMs

const log = dlog('csb:test:stress:followerrun')
const debugLog = dlog('csb:test:stress:followerdebug')

const redis = new Redis({
    host: redisHost, // Redis server host
    port: redisPort, // Redis server port
    db: 0,
})

const redisE2EMessageDeliveryTracking = new Redis({
    host: redisHost, // Redis server host
    port: redisPort, // Redis server port
    db: 1,
})

let intervalId: NodeJS.Timeout
let startCountingHeapTimer = Date.now() + 10000000
let snapshotsCounter = 0

beforeAll(() => {
    // Set up an interval to call generateHeapDump every 30 seconds
    intervalId = setInterval(() => {
        //writeHeapSnapshotToStdOut()
        //if defaultHeapDumpCounter is set to 0, then we don't want to generate heap dumps
        if (defaultHeapDumpCounter > 0) {
            // if startCountingHeapTimer >0 , then maybe we should generate a heap dump
            if (startCountingHeapTimer > 0) {
                // if the current time is greater than the first snapshot time, then we should generate a heap dump
                if (
                    Date.now() >
                        startCountingHeapTimer +
                            heapDumpFirstSnapshoMs +
                            snapshotsCounter * heapDumpIntervalMs &&
                    snapshotsCounter < heapDumpCounter
                ) {
                    snapshotsCounter++
                    // generate a heap dump
                    writeHeapSnapshotToStdOut()
                }
            }
        }
    }, 1000)
})

afterAll(async () => {
    // Clear the interval to stop calling generateHeapDump after tests are done
    await redisE2EMessageDeliveryTracking.quit()
    await redis.quit()
    clearInterval(intervalId)
})

describe('Stress test', () => {
    test(
        'stress test',
        async () => {
            const followerProcesses = []

            for (let i = 0; i < numberOfClientsPerProcess; i++) {
                followerProcesses.push(singleTestProcess())
            }
            await Promise.all(followerProcesses)
            //await singleTestProcess()
        },
        loadTestDurationMs * 10,
    )
})

async function singleTestProcess(): Promise<void> {
    let coordinationSpaceId: string | undefined
    let coordinationChannelId: string | undefined

    const sendTimeHistogram = new Map<number | 'inf', number>([
        [500, 0],
        [1000, 0],
        [1500, 0],
        [2000, 0],
        ['inf', 0],
    ])

    const channelTownPairs = new ChannelTownPairs()
    const townsJoined = new Set<string>()
    const channelsJoined: string[] = []
    const userNumPerChannel = new Map<string, number>()
    const trackedChannels = new Set<string>()

    let canLoad = false
    //Step 1 - Create client
    const result = await createFundedTestUser()
    await fundWallet(result.walletWithProvider)

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
                            log('joining town with Id: ', townId, 'and chanelId: ', channelId)
                            await result.riverSDK.joinChannel(channelId)
                            await result.riverSDK.sendTextMessage(
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
                        await result.riverSDK.sendTextMessage(coordinationChannelId, 'READY')
                    }
                    if (body.startsWith('START LOAD:')) {
                        log('Received start load message', body)
                        startCountingHeapTimer = Date.now()
                        const deserializedData = JSON.parse(body.slice(12)) as []

                        const channelTrackingInfo: ChannelTrackingInfo[] = deserializedData.map(
                            (item: any) => {
                                const channelTrackingInfoItem: {
                                    channelId: string
                                    tracked: boolean
                                    numUsersJoined: number
                                } = item
                                const channelTrackingInfo = new ChannelTrackingInfo(
                                    channelTrackingInfoItem.channelId,
                                )
                                channelTrackingInfo.setTracked(channelTrackingInfoItem.tracked)
                                channelTrackingInfo.setNumUsersJoined(
                                    channelTrackingInfoItem.numUsersJoined,
                                )
                                return channelTrackingInfo
                            },
                        )

                        for (
                            let channelsCounter = 0;
                            channelsCounter < channelTrackingInfo.length;
                            channelsCounter++
                        ) {
                            log('channelTrackingInfo', channelTrackingInfo[channelsCounter])
                            const a = channelTrackingInfo[channelsCounter].getChannelId()
                            const b = channelTrackingInfo[channelsCounter].getNumUsersJoined()
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
                    debugLog('Received load message', body)
                    await updateRedisValueIfGreater('R' + body, Date.now())
                    if (body.startsWith('TEST MESSAGE AT')) {
                        //TODO: add exception handling
                        debugLog('Decrement called for ', body)
                        if (trackedChannels.has(streamId)) {
                            await decrementAndDeleteIfZero(body)
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
            log('Error:', e)
        }
        await new Promise((resolve) => setTimeout(resolve, 1000)) // Delay for 1 second
    }

    if (coordinationChannelId !== undefined) {
        await result.riverSDK.sendTextMessage(coordinationChannelId, 'JOINED')
    }

    while (!canLoad) {
        // Perform some actions or logic in the loop
        debugLog('Waiting for load start signal')
        await pauseForXMiliseconds(1000) // 1 second delay
    }

    if (coordinationChannelId !== undefined) {
        await result.riverSDK.sendTextMessage(coordinationChannelId, 'STARTING LOAD')
    }

    const startLoadTime = Date.now()
    while (Date.now() - startLoadTime <= loadTestDurationMs) {
        const beforeContentPrepared = performance.now()
        // Perform some actions or logic in the loop
        const channelToSendMessage = channelsJoined[getRandomInt(channelsJoined.length)]
        const newHash = generateRandomHash()
        const testMessageText = 'TEST MESSAGE AT ' + Date.now() + ' ' + newHash
        debugLog('Sent message to channel', channelToSendMessage, 'with text ', testMessageText)
        let recepients = 0
        if (userNumPerChannel.has(channelToSendMessage)) {
            const usersPerChannel = userNumPerChannel.get(channelToSendMessage)
            if (usersPerChannel !== undefined) {
                //TODO: fix this if statements if possible
                recepients = usersPerChannel - 1
            }
        }
        if (recepients > 0 && trackedChannels.has(channelToSendMessage)) {
            await redis.set(testMessageText, recepients)
            debugLog('redis set', testMessageText, recepients)
        }
        const afterContentPrepared = performance.now()
        await result.riverSDK.sendTextMessage(channelToSendMessage, testMessageText)
        const afterMessageSent = performance.now()
        if (recepients > 0 && trackedChannels.has(channelToSendMessage)) {
            const afterMessageSentForDeliveryTracking = Date.now()
            const messageSentTrackTimeKey = 'S' + testMessageText
            //We use database #1 for tracking message delivery
            await redisE2EMessageDeliveryTracking.set(
                messageSentTrackTimeKey,
                afterMessageSentForDeliveryTracking,
            )
        }
        if (afterMessageSent - afterContentPrepared > 500) {
            log('Sending message took ', afterMessageSent - afterContentPrepared, 'ms')
        }

        //That will do histogram for specific follower
        incrementSendTimeHistogramMapValue(
            afterMessageSent - afterContentPrepared,
            sendTimeHistogram,
        )

        //That will do histogram for all followers
        await incrementSendTimeHistogramRedisValue(afterMessageSent - afterContentPrepared)
        if (result.riverSDK.client.getSizeOfEncryptedСontentQueue() > 10) {
            log(
                'size of unencrypted events queue',
                result.riverSDK.client.getSizeOfEncryptedСontentQueue(),
            )
        }
        // Introduce a delay (e.g., 1 second) before the next iteration
        const pauseTime = getRandomInt(maxMsgDelayMs - 1000) + 1000
        const afterAllDone = performance.now()
        if (pauseTime > afterAllDone - beforeContentPrepared) {
            await pauseForXMiliseconds(pauseTime - (afterAllDone - beforeContentPrepared))
        } else {
            debugLog('No pause needed')
        }
    }
    if (coordinationChannelId !== undefined) {
        await result.riverSDK.sendTextMessage(coordinationChannelId, 'LOAD OVER')
    }

    let messagesProcessed = false
    let timeCounter = 1000
    let lastDbSize = 0
    while (!messagesProcessed && timeCounter < 60000) {
        lastDbSize = await redis.dbsize()
        await pauseForXMiliseconds(1000)
        timeCounter += 1000
        if (lastDbSize === 0) {
            messagesProcessed = true
        }
        log('# of not processed messages: ', lastDbSize, ' at ', timeCounter, ' ms after all sent')
        log(
            'size of unencrypted events queue',
            result.riverSDK.client.getSizeOfEncryptedСontentQueue(),
        )
    }
    await result.riverSDK.client.stopSync()
    result.riverSDK.client.removeAllListeners()
    log(sendTimeHistogram)
    expect(lastDbSize).toBe(0)
}

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
    await provider.send('anvil_setBalance', [walletToFund.address, amountInWei])
    return true
}

function generateRandomHash(): string {
    const randomBytes = crypto.randomBytes(32)
    const randomHash = crypto.createHash('sha256').update(randomBytes).digest('hex')
    return randomHash
}

async function decrementAndDeleteIfZero(key: string): Promise<number | null> {
    debugLog('redis update key', key)
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

function writeHeapSnapshotToStdOut() {
    const startWriting = performance.now()
    const tmpDir = os.tmpdir()
    const tmpFilename = path.join(tmpDir, `heapdump-${Date.now()}.heapsnapshot`)
    log('Writing heap snapshot to', tmpFilename)
    v8.writeHeapSnapshot(tmpFilename)
    const endWriting = performance.now()
    log('Heap snapshot written to stdout in ', endWriting - startWriting, ' ms')
}

function incrementSendTimeHistogramMapValue(
    sendTime: number,
    map: Map<number | 'inf', number>,
): void {
    let key: number | 'inf'

    if (sendTime >= 0 && sendTime <= 500) {
        key = 500
    } else if (sendTime >= 501 && sendTime <= 1000) {
        key = 1000
    } else if (sendTime >= 1001 && sendTime <= 1500) {
        key = 1500
    } else if (sendTime >= 1501 && sendTime <= 2000) {
        key = 2000
    } else {
        key = 'inf'
    }

    const currentValue = map.get(key) || 0
    map.set(key, currentValue + 1)
}

async function incrementSendTimeHistogramRedisValue(sendTime: number): Promise<void> {
    let key: string

    if (sendTime >= 0 && sendTime <= 500) {
        key = 'T500'
    } else if (sendTime >= 501 && sendTime <= 1000) {
        key = 'T1000'
    } else if (sendTime >= 1001 && sendTime <= 1500) {
        key = 'T1500'
    } else if (sendTime >= 1501 && sendTime <= 2000) {
        key = 'T2000'
    } else {
        key = 'Tinf'
    }

    // Increment the value associated with the key in Redis
    await redisE2EMessageDeliveryTracking.incr(key)
}

async function updateRedisValueIfGreater(key: string, value: number): Promise<void> {
    // Lua script for checking and setting the value if the new value is greater
    const luaScript = `
        local current = redis.call('GET', KEYS[1])
        if current == false or tonumber(current) < tonumber(ARGV[1]) then
            redis.call('SET', KEYS[1], ARGV[1])
            return 1
        else
            return 0
        end
    `
    // Execute the Lua script
    // KEYS[1] is mapped to `key`, and ARGV[1] is mapped to `value`
    await redisE2EMessageDeliveryTracking.eval(luaScript, 1, key, value)
}
