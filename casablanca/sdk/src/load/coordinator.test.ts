/**
 * @group stress-test-leader
 */

import { ethers } from 'ethers'
import { makeUserContextFromWallet } from '../util.test'
import { makeStreamRpcClient } from '../makeStreamRpcClient'
import { userIdFromAddress } from '../id'
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
    mainSpaceId,
    mainChannelId,
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
} from './stressconfig.test'

const baseChainRpcUrl = process.env.BASE_CHAIN_RPC_URL
    ? process.env.BASE_CHAIN_RPC_URL
    : jsonRpcProviderUrl
const riverNodeUrl = process.env.RIVER_NODE_URL ? process.env.RIVER_NODE_URL : rpcClientURL
const coordinationSpaceId = process.env.COORDINATION_SPACE_ID
    ? process.env.COORDINATION_SPACE_ID
    : mainSpaceId
const coordinationChannelId = process.env.COORDINATION_CHANNEL_ID
    ? process.env.COORDINATION_CHANNEL_ID
    : mainChannelId
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

const log = dlog('csb:test:stress')

const followers: Map<string, string> = new Map()
const readyUsers: Set<string> = new Set()
const loadOverUsers: Set<string> = new Set()

const usersInChannels: Map<string, string[]> = new Map()

const channelTrackingInfo: ChannelTrackingInfo[] = []

const redis = new Redis({
    host: redisHost, // Redis server host
    port: redisPort, // Redis server port
})

describe('Stress test', () => {
    test(
        'stress test',
        async () => {
            log('coordinationSpaceId: ', coordinationSpaceId)
            log('coordinationChannelId: ', coordinationChannelId)

            redis.flushall()
            const result = await createFundedTestUser()
            fundWallet(result.walletWithProvider)

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
                        //console.log('Added message', body)
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
                log('Waiting for followers')
                await pauseForXMiliseconds(1000)
            }
            log('All followers joined main channel')
            await result.riverSDK.sendTextMessage(
                coordinationChannelId,
                'All followers joined main channel',
            )

            //--------------------------------------------------------------------------------------------
            //Now we need to generate test towns and test channels there
            //--------------------------------------------------------------------------------------------

            const totalNumberOfChannels = numTowns * numChannelsPerTown
            let counter = 0

            for (let i = 0; i < numTowns; i++) {
                const townCreationResult = await result.riverSDK.createTownWithDefaultChannel(
                    'Town ' + i,
                    'Channel 0 0',
                )
                await result.riverSDK.joinChannel(townCreationResult.defaultChannelStreamId)

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
                log('Waiting for followers')
                await pauseForXMiliseconds(1000)
            }

            await result.riverSDK.sendTextMessage(
                coordinationChannelId,
                'WONDERLAND: ' + JSON.stringify(channelWithTowns),
            )

            while (readyUsers.size != numFollowers) {
                log('Waiting for followers to be ready')
                await pauseForXMiliseconds(1000)
            }

            log('USERS IN CHANNELS', JSON.stringify(usersInChannels))

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

            await pauseForXMiliseconds(10000)

            while (loadOverUsers.size != numFollowers) {
                log('Waiting')
                await pauseForXMiliseconds(1000)
            }
            await pauseForXMiliseconds(60000)
            result.riverSDK.client.stopSync()
        },
        loadTestDurationMs * 10,
    )
})

async function fundWallet(walletToFund: ethers.Wallet) {
    const provider = new ethers.providers.JsonRpcProvider(baseChainRpcUrl)
    const amountInWei = ethers.BigNumber.from(10).pow(18).toHexString()
    provider.send('anvil_setBalance', [walletToFund.address, amountInWei])
    return true
}

async function createFundedTestUser(): Promise<{
    riverSDK: RiverSDK
    provider: ethers.providers.JsonRpcProvider
    walletWithProvider: ethers.Wallet
}> {
    const wallet = ethers.Wallet.createRandom()
    log('Wallet:', wallet)
    // Create a new wallet
    const provider = new ethers.providers.JsonRpcProvider(baseChainRpcUrl)
    const walletWithProvider = wallet.connect(provider)

    const context = await makeUserContextFromWallet(walletWithProvider)

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
