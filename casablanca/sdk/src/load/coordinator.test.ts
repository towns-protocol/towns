/**
 * @group stress-test-leader
 */

import { ethers } from 'ethers'
import { makeUserContextFromWallet } from '../util.test'
import { makeStreamRpcClient } from '../makeStreamRpcClient'
import { userIdFromAddress, makeUniqueSpaceStreamId, makeUniqueChannelStreamId } from '../id'
import { Client } from '../client'
import { RiverDbManager } from '../riverDbManager'
import { MockEntitlementsDelegate } from '../utils'
import { createSpaceDapp } from '@river/web3'
import Redis from 'ioredis'
import {
    RiverSDK,
    TownsWithChannels,
    ChannelTownPairs,
    ChannelTrackingInfo,
    pauseForXMiliseconds,
    getRandomInt,
} from '../testSdk'
import { dlog } from '@river/dlog'
import {
    townsToCreate,
    channelsPerTownToCreate,
    followersNumber,
    loadDurationMs,
    jsonRpcProviderUrl,
    rpcClientURL,
    defaultChannelSamplingRate,
    defaultCoordinatorLeaveChannelsFlag,
    defaultRedisHost,
    defaultRedisPort,
} from './stressconfig'

const baseChainRpcUrl = process.env.BASE_CHAIN_RPC_URL
    ? process.env.BASE_CHAIN_RPC_URL
    : jsonRpcProviderUrl
const riverNodeUrl = process.env.RIVER_NODE_URL ? process.env.RIVER_NODE_URL : rpcClientURL
const coordinationSpaceId = makeUniqueSpaceStreamId()
const coordinationChannelId = makeUniqueChannelStreamId()
const numTowns = process.env.NUM_TOWNS ? parseInt(process.env.NUM_TOWNS) : townsToCreate
const numChannelsPerTown = process.env.NUM_CHANNELS_PER_TOWN
    ? parseInt(process.env.NUM_CHANNELS_PER_TOWN)
    : channelsPerTownToCreate
const numFollowers = process.env.NUM_FOLLOWERS
    ? parseInt(process.env.NUM_FOLLOWERS)
    : followersNumber
const loadTestDurationMs = process.env.LOAD_TEST_DURATION_MS
    ? parseInt(process.env.LOAD_TEST_DURATION_MS)
    : loadDurationMs
const channelSamplingRate = process.env.CHANNEL_SAMPLING_RATE
    ? parseInt(process.env.CHANNEL_SAMPLING_RATE)
    : defaultChannelSamplingRate

const redisHost = process.env.REDIS_HOST ? process.env.REDIS_HOST : defaultRedisHost
const redisPort = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : defaultRedisPort

const coordinatorLeaveChannels = process.env.COORDINATOR_LEAVE_CHANNELS
    ? process.env.COORDINATOR_LEAVE_CHANNELS
    : defaultCoordinatorLeaveChannelsFlag

const log = dlog('csb:test:stress:run')
const debugLog = dlog('csb:test:stress:debug')

log('Current Node Version:', process.version)

const followers: Map<string, string> = new Map()
const readyUsers: Set<string> = new Set()
const loadOverUsers: Set<string> = new Set()

const usersInChannels: Map<string, string[]> = new Map()

const channelTrackingInfo: ChannelTrackingInfo[] = []

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

const E2EDeliveryTimeMap = new Map<string, number>()

const E2EDeliveryTimeHistogram = new Map<number | 'inf', number>([
    [500, 0],
    [1000, 0],
    [1500, 0],
    [2000, 0],
    [3000, 0],
    [4000, 0],
    [5000, 0],
    ['inf', 0],
])

describe('Stress test', () => {
    test(
        'stress test',
        async () => {
            log('v2.50')
            await redis.flushall()
            await redisE2EMessageDeliveryTracking.flushall()

            //initilize Redis key for send time histogram
            await redisE2EMessageDeliveryTracking.set('T500', 0)
            await redisE2EMessageDeliveryTracking.set('T1000', 0)
            await redisE2EMessageDeliveryTracking.set('T1500', 0)
            await redisE2EMessageDeliveryTracking.set('T2000', 0)
            await redisE2EMessageDeliveryTracking.set('Tinf', 0)

            log('coordinationSpaceId: ', coordinationSpaceId)
            log('coordinationChannelId: ', coordinationChannelId)
            await redis.set('coordinationSpaceId', coordinationSpaceId)
            await redis.set('coordinationChannelId', coordinationChannelId)

            const result = await createFundedTestUser()
            await fundWallet(result.walletWithProvider)

            log('Main user address: ', result.walletWithProvider.address)

            let followersCounter = numFollowers

            const townsWithChannels = new TownsWithChannels()
            const channelWithTowns = new ChannelTownPairs()

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
                            if (body === 'JOINED') {
                                //Means that we are processing followers joining main channel in the beginning
                                followers.set(event.creatorUserId, 'JOINED')
                                await result.riverSDK.sendTextMessage(
                                    coordinationChannelId,
                                    'Follower with ID ' +
                                        event.creatorUserId +
                                        ' joined main channel',
                                )
                                log('User with Id joined', event.creatorUserId)
                                followersCounter--
                                log('Joined main channel')
                            }
                            if (body === 'READY') {
                                log('User with Id ready', event.creatorUserId)
                                readyUsers.add(event.creatorUserId) //We cannot rely purely on counter of ready messages just in case
                            }
                            if (body === 'LOAD OVER') {
                                log('User with Id is done with load', event.creatorUserId)
                                loadOverUsers.add(event.creatorUserId) //We cannot rely purely on counter of ready messages just in case
                            }
                            if (body.startsWith('USER JOINED CHANNEL: ')) {
                                const userId = body.substring(21, 63)
                                const channelId = body.substring(66)

                                if (!usersInChannels.has(channelId)) {
                                    usersInChannels.set(channelId, [])
                                }
                                if (usersInChannels.get(channelId)) {
                                    const x = usersInChannels.get(channelId)
                                    if (x) {
                                        x.push(userId)
                                        usersInChannels.set(channelId, x)
                                    }
                                }
                            }
                        }
                    }
                })
            }

            handleEventDecrypted(result.riverSDK.client)
            await result.riverSDK.createTownAndChannelWithPresetIDs(
                'main town',
                coordinationSpaceId,
                'Controller Town',
                'main channel',
                coordinationChannelId,
            )

            await result.riverSDK.joinChannel(coordinationChannelId)

            while (followersCounter != 0) {
                // Perform some actions in the loop
                debugLog('Waiting for followers')
                debugLog('Remaining followers counter', followersCounter)
                await pauseForXMiliseconds(1000)
            }
            log('All followers joined main channel')

            //clean coordination information from redis
            await redis.del('coordinationSpaceId')
            await redis.del('coordinationChannelId')

            await result.riverSDK.sendTextMessage(
                coordinationChannelId,
                'All followers joined main channel',
            )

            //--------------------------------------------------------------------------------------------
            //Now we need to generate test towns and test channels there
            //--------------------------------------------------------------------------------------------

            const totalNumberOfChannels = numTowns * numChannelsPerTown
            let counter = 0
            let channelsCounter = 0

            for (let i = 0; i < numTowns; i++) {
                const townCreationResult = await result.riverSDK.createTownWithDefaultChannel(
                    'Town ' + i,
                    'Channel 0 0',
                )
                await result.riverSDK.joinChannel(townCreationResult.defaultChannelStreamId)
                channelsCounter++
                log(i + 1, 'towns out of ', numTowns, ' created')
                log(channelsCounter, 'channels out of ', totalNumberOfChannels, ' created')

                townsWithChannels.addChannelToTown(
                    townCreationResult.spaceStreamId,
                    townCreationResult.defaultChannelStreamId,
                )

                counter++
                await result.riverSDK.sendTextMessage(
                    coordinationChannelId,
                    counter +
                        ' channels of ' +
                        totalNumberOfChannels +
                        ' created' +
                        townCreationResult.defaultChannelStreamId,
                )

                channelWithTowns.addRecord(
                    townCreationResult.defaultChannelStreamId,
                    townCreationResult.spaceStreamId,
                )

                for (let j = 0; j < numChannelsPerTown - 1; j++) {
                    // -1 because we already created default channel
                    const channelName = 'Channel ' + i + ' ' + j
                    const channelCreationResult = await result.riverSDK.createChannel(
                        townCreationResult.spaceStreamId,
                        channelName,
                        '',
                    )
                    await result.riverSDK.joinChannel(channelCreationResult)
                    channelsCounter++
                    log(channelsCounter, 'channels out of ', totalNumberOfChannels, ' created')
                    counter++
                    await result.riverSDK.sendTextMessage(
                        coordinationChannelId,
                        counter +
                            ' channels of ' +
                            totalNumberOfChannels +
                            ' created with id' +
                            channelCreationResult,
                    )

                    townsWithChannels.addChannelToTown(
                        townCreationResult.spaceStreamId,
                        channelCreationResult,
                    )
                    channelWithTowns.addRecord(
                        channelCreationResult,
                        townCreationResult.spaceStreamId,
                    )
                }
            }

            if (coordinatorLeaveChannels) {
                const joinedChannels = channelWithTowns.getRecords()
                log('Leaving channels number', joinedChannels.length)
                for (let j = joinedChannels.length - 1; j >= 0; j--) {
                    await result.riverSDK.leaveChannel(joinedChannels[j][0])
                    log('Left channel', joinedChannels[j][0])
                }
            }

            //--------------------------------------------------------------------------------------------
            //Now we need to generate test towns and test channels there
            //--------------------------------------------------------------------------------------------

            while (followersCounter != 0) {
                // Perform some actions in the loop
                debugLog('Waiting for followers')
                await pauseForXMiliseconds(1000)
            }

            await result.riverSDK.sendTextMessage(
                coordinationChannelId,
                'WONDERLAND: ' + JSON.stringify(channelWithTowns),
            )

            while (readyUsers.size != numFollowers) {
                debugLog('Waiting for followers to be ready')
                await pauseForXMiliseconds(1000)
            }

            debugLog('USERS ARE CHANNELS')

            usersInChannels.forEach((values, key) => {
                const trackingInfo = new ChannelTrackingInfo(key)
                const randomTrackedValue = getRandomInt(100) < channelSamplingRate
                trackingInfo.setNumUsersJoined(values.length)
                trackingInfo.setTracked(randomTrackedValue)
                channelTrackingInfo.push(trackingInfo)
            })

            await result.riverSDK.sendTextMessage(
                coordinationChannelId,
                'START LOAD: ' + JSON.stringify(channelTrackingInfo),
            )

            const loadStartTime = Date.now()

            await pauseForXMiliseconds(10000)

            while (loadOverUsers.size != numFollowers) {
                log('Waiting. Users load over:', loadOverUsers.size)
                log('Unprocessed messages number:', await redis.dbsize())
                await pauseForXMiliseconds(1000)
            }
            log('Final number of user done with load:', loadOverUsers.size)
            const loadEndTime = Date.now()

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
                log(
                    '# of not processed messages: ',
                    lastDbSize,
                    ' at ',
                    timeCounter,
                    ' ms after all sent',
                )
            }
            log('Test executed')
            await result.riverSDK.client.stopSync()

            //--------------------------------------------------------------------------------------------
            //Let's do delivery histogram here
            //--------------------------------------------------------------------------------------------

            let cursor = '0'

            do {
                // Use the SCAN command with cursor, MATCH pattern, and COUNT
                const [nextCursor, keys] = await redisE2EMessageDeliveryTracking.scan(
                    cursor,
                    'MATCH',
                    '*',
                    'COUNT',
                    10,
                )

                // For each key, fetch and print its value
                for (const key of keys) {
                    const value = await redisE2EMessageDeliveryTracking.get(key) // Assuming all keys are string type
                    const baseKey = key.slice(1)
                    if (value && key) {
                        if (key.charAt(0) === 'S') {
                            log('S value', value)
                            //We are processing sent time key
                            //Check if map contains this key already - if it is there it means that we already have receiving time there
                            if (E2EDeliveryTimeMap.has(baseKey)) {
                                const receivingTime = E2EDeliveryTimeMap.get(baseKey)
                                const sendingTime = parseInt(value)
                                if (receivingTime) {
                                    const diff = receivingTime - sendingTime
                                    incrementE2EDeliveryTimeHistogramMapValue(
                                        diff,
                                        E2EDeliveryTimeHistogram,
                                    )
                                    E2EDeliveryTimeMap.delete(baseKey)
                                }
                            } else {
                                //Step 2. If not, add sending time to the map
                                E2EDeliveryTimeMap.set(baseKey, parseInt(value))
                            }
                        } else if (key.charAt(0) === 'R') {
                            log('R value', value)
                            //We are processing recieved time key
                            //Check if map contains this key already - if it is there it means that we already have sent time there
                            if (E2EDeliveryTimeMap.has(baseKey)) {
                                const sendingTime = E2EDeliveryTimeMap.get(baseKey)
                                const recievingTime = parseInt(value)
                                if (sendingTime) {
                                    const diff = recievingTime - sendingTime
                                    E2EDeliveryTimeMap.delete(baseKey)
                                    incrementE2EDeliveryTimeHistogramMapValue(
                                        diff,
                                        E2EDeliveryTimeHistogram,
                                    )
                                }
                            } else {
                                //Step 2. If not, add recieving time to the map
                                E2EDeliveryTimeMap.set(baseKey, parseInt(value))
                            }
                        }
                    }
                }
                cursor = nextCursor
            } while (cursor !== '0')

            log(E2EDeliveryTimeHistogram)

            log('>500: ', await redisE2EMessageDeliveryTracking.get('T500'))
            log('501-1000', await redisE2EMessageDeliveryTracking.get('T1000'))
            log('1001-1500', await redisE2EMessageDeliveryTracking.get('T1500'))
            log('1501-2000', await redisE2EMessageDeliveryTracking.get('T2000'))
            log('2001-inf', await redisE2EMessageDeliveryTracking.get('Tinf'))

            const unrecievedMessages = await getAllKeysAndValues(redis)
            const minMaxDates = findMinMaxDates(unrecievedMessages)
            log('Min date:', minMaxDates?.minDate)
            log('Max date:', minMaxDates?.maxDate)
            log('Load start time:', loadStartTime)
            log('Load end time:', loadEndTime)

            await redisE2EMessageDeliveryTracking.quit()
            await redis.quit()
            result.riverSDK.client.removeAllListeners()
            expect(lastDbSize).toBe(0)
        },
        loadTestDurationMs * 10,
    )
})

async function fundWallet(walletToFund: ethers.Wallet) {
    const provider = new ethers.providers.JsonRpcProvider(baseChainRpcUrl)
    const amountInWei = ethers.BigNumber.from(10).pow(18).toHexString()
    await provider.send('anvil_setBalance', [walletToFund.address, amountInWei])
    return true
}

async function createFundedTestUser(): Promise<{
    riverSDK: RiverSDK
    provider: ethers.providers.JsonRpcProvider
    walletWithProvider: ethers.Wallet
}> {
    const wallet = ethers.Wallet.createRandom()
    debugLog('Wallet:', wallet)
    // Create a new wallet
    debugLog('baseChainRpcUrl:', baseChainRpcUrl)
    const provider = new ethers.providers.JsonRpcProvider(baseChainRpcUrl)
    debugLog('provider:', provider)
    const walletWithProvider = wallet.connect(provider)
    debugLog('Wallet wtih Provided:', walletWithProvider)
    const context = await makeUserContextFromWallet(walletWithProvider)
    debugLog('Context:', context)
    debugLog('River node url from createFundedTestUser:', riverNodeUrl)
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

function incrementE2EDeliveryTimeHistogramMapValue(
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
    } else if (sendTime >= 2001 && sendTime <= 3000) {
        key = 3000
    } else if (sendTime >= 3001 && sendTime <= 4000) {
        key = 4000
    } else if (sendTime >= 4001 && sendTime <= 5000) {
        key = 5000
    } else {
        key = 'inf'
    }

    const currentValue = map.get(key) || 0
    map.set(key, currentValue + 1)
}

async function getAllKeysAndValues(redisInstance: Redis): Promise<Map<Date, string>> {
    const resultMap: Map<Date, string> = new Map()
    let cursor = '0'
    do {
        // Use the SCAN command to iteratively get keys
        const reply: [string, string[]] = await redisInstance.scan(
            cursor,
            'MATCH',
            '*',
            'COUNT',
            100,
        )
        cursor = reply[0]
        const keys = reply[1]

        for (const key of keys) {
            const value = await redis.get(key)
            if (value !== null) {
                resultMap.set(extractTimestampAndConvertToDate(key), value)
            }
        }
    } while (cursor !== '0')
    return resultMap
}

function extractTimestampAndConvertToDate(inputString: string): Date {
    const timestampString = inputString.substring(16)
    const date = new Date(timestampString)
    return date
}

function findMinMaxDates(map: Map<Date, string>): { minDate: Date; maxDate: Date } | null {
    if (map.size === 0) {
        return null
    }

    let minDate: Date = new Date(Number.MAX_SAFE_INTEGER)
    let maxDate: Date = new Date(Number.MIN_SAFE_INTEGER)

    map.forEach((value, key) => {
        if (key < minDate) {
            minDate = key
        }
        if (key > maxDate) {
            maxDate = key
        }
    })

    return { minDate, maxDate }
}
