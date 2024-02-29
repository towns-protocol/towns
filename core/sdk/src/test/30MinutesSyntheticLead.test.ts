/**
 * @group synthetic
 */

import { check, dlog } from '@river/dlog'
import { makeUserContextFromWallet, makeDonePromise, waitFor } from '../util.test'
import { ethers } from 'ethers'
import { jest } from '@jest/globals'
import { makeStreamRpcClient } from '../makeStreamRpcClient'
import { userIdFromAddress } from '../id'
import { Client } from '../client'
import { RiverDbManager } from '../riverDbManager'
import { MockEntitlementsDelegate } from '../utils'
import { Queue, Worker } from 'bullmq'
import {
    testRunTimeMs,
    connectionOptions,
    loginWaitTime,
    leaderKey,
    jsonRpcProviderUrl,
    fromFollowerQueueName,
    fromLeaderQueueName,
    envName,
    defaultEnvironmentName,
    testSpamChannelName,
    riverNodeRpcUrl,
    followerId,
    followerKey,
    followerUserName,
    leaderId,
    leaderUserName,
    replySentTime,
} from './30MinutesSyntheticConfig'
import { DecryptedTimelineEvent } from '../types'
import { SnapshotCaseType } from '@river/proto'
import { createSpaceDapp } from '@river/web3'
import { RiverSDK } from '../testSdk'

// This is a temporary hack because importing viem via SpaceDapp causes a jest error
// specifically the code in ConvertersEntitlements.ts - decodeAbiParameters and encodeAbiParameters functions have an import that can't be found
// Need to use the new space dapp in an actual browser to see if this is a problem there too before digging in further
jest.unstable_mockModule('viem', async () => {
    return {
        BaseError: class extends Error {},
        hexToString: jest.fn(),
        encodeFunctionData: jest.fn(),
        decodeAbiParameters: jest.fn(),
        encodeAbiParameters: jest.fn(),
        parseAbiParameters: jest.fn(),
        zeroAddress: `0x${'0'.repeat(40)}`,
    }
})

const log = dlog('csb:test:synthetic')

log(
    JSON.stringify(
        {
            testRunTimeMs,
            connectionOptions,
            loginWaitTime,
            leaderKey,
            jsonRpcProviderUrl,
            fromFollowerQueueName,
            fromLeaderQueueName,
            envName,
            defaultEnvironmentName,
            testSpamChannelName,
            riverNodeRpcUrl,
            followerId,
            followerKey,
            followerUserName,
            leaderId,
            leaderUserName,
            replySentTime,
        },
        null,
        2,
    ),
)

const healthcheckQueueLeader = new Queue(fromLeaderQueueName, {
    connection: connectionOptions,
})

describe('mirrorMessages', () => {
    test(
        'mirrorMessages',
        async () => {
            let followerLoggedIn = false
            let followerJoinedTown = false

            //Step 1 - Initialize worker to track follower status
            // eslint-disable-next-line
            const _leadWorker = new Worker(
                fromFollowerQueueName,
                // eslint-disable-next-line
                async (command) => {
                    const commandData = command.data as { commandType: string; command: string }
                    log('commandData', commandData)
                    if (commandData.commandType === 'followerLoggedIn') {
                        followerLoggedIn = true
                        log('followerLoggedIn flag set to true')
                    }
                    if (commandData.commandType === 'followerJoinedTown') {
                        followerJoinedTown = true
                        log('followerJoinedTown flag set to true')
                    }
                    return
                },
                { connection: connectionOptions, concurrency: 50 },
            )

            //Step 2 - login to Towns
            const messagesSet: Set<string> = new Set()
            log('start')
            // set up the web3 provider and spacedap
            const leaderWallet = new ethers.Wallet(leaderKey)
            const provider = new ethers.providers.JsonRpcProvider(jsonRpcProviderUrl)
            const walletWithProvider = leaderWallet.connect(provider)
            const context = await makeUserContextFromWallet(walletWithProvider)

            const rpcClient = makeStreamRpcClient(riverNodeRpcUrl)
            const userId = userIdFromAddress(context.creatorAddress)

            const cryptoStore = RiverDbManager.getCryptoDb(userId)
            const client = new Client(
                context,
                rpcClient,
                cryptoStore,
                new MockEntitlementsDelegate(),
            )
            client.setMaxListeners(100)
            await client.initializeUser()
            const balance = await walletWithProvider.getBalance()
            log('Wallet balance:', balance.toString())
            log('Wallet address:', leaderWallet.address)
            log('Wallet address:', walletWithProvider.address)
            const startSyncResult = client.startSync()
            log('startSyncResult', startSyncResult)
            log('client', client.userId)

            await healthcheckQueueLeader.add(fromLeaderQueueName, {
                commandType: 'leaderLoggedIn',
                command: '',
            })
            log('leaderLoggedIn notification sent')

            //Step 3 - wait for follower to be logged in
            await waitFor(
                () => {
                    expect(followerLoggedIn).toBe(true)
                },
                {
                    timeoutMS: loginWaitTime,
                },
            )
            log('Follower logged in notification recieved')

            //Step 3.5 - if we run on transient environment, we need to create a town and join it
            //TODO: spaceDatpp creation should be moved to the test SDK
            const spaceDapp = createSpaceDapp({
                chainId: (await walletWithProvider.provider.getNetwork()).chainId,
                provider: walletWithProvider.provider,
            })

            const riverSDK = new RiverSDK(spaceDapp, client, walletWithProvider)

            let testTownId
            let testChannelId

            if (envName !== defaultEnvironmentName) {
                log('Creating town')
                const result = await riverSDK.createTownWithDefaultChannel(
                    'test town',
                    'town metadata',
                    testSpamChannelName,
                )

                log('result', result)
                testChannelId = result.defaultChannelStreamId
                testTownId = result.spaceStreamId
                //If we run agains transient environment, we need to ask second client to join the town and wait for it.
                log('Follower logged in notification recieved')
            } else {
                const redirectLocation = await checkRedirectLocation(
                    'https://latest-dev-town.towns.com/',
                )
                const regex = /\/t\/([A-Za-z0-9-]+)\//
                const match = redirectLocation?.match(regex)
                if (!match) {
                    throw new Error('Redirect location is not valid')
                }
                testTownId = match[1]
                await riverSDK.joinTown(testTownId)
                const availableChannels = await riverSDK.getAvailableChannels(testTownId)
                availableChannels.forEach((channelName, channelId) => {
                    if (channelName === testSpamChannelName) {
                        testChannelId = channelId
                    }
                })

                if (!testChannelId) {
                    testChannelId = await riverSDK.createChannel(
                        testTownId,
                        testSpamChannelName,
                        testSpamChannelName,
                    )
                }
            }

            await healthcheckQueueLeader.add(fromLeaderQueueName, {
                commandType: 'joinTown',
                command: {
                    townId: testTownId,
                    channelId: testChannelId,
                },
            })

            await waitFor(
                () => {
                    expect(followerJoinedTown).toBe(true)
                },
                {
                    timeoutMS: loginWaitTime,
                },
            )

            //Step 4 - send message
            const done = makeDonePromise()
            client.on(
                'eventDecrypted',
                (
                    streamId: string,
                    contentKind: SnapshotCaseType,
                    event: DecryptedTimelineEvent,
                ): void => {
                    done.runAndDoneAsync(async () => {
                        // await client.decryptEventIfNeeded(event)
                        const clearEvent = event.decryptedContent
                        check(clearEvent.kind === 'channelMessage')
                        expect(clearEvent.content?.payload).toBeDefined()
                        if (
                            clearEvent.content?.payload?.case === 'post' &&
                            clearEvent.content?.payload?.value?.content?.case === 'text'
                        ) {
                            const body = clearEvent.content?.payload?.value?.content.value?.body
                            messagesSet.add(body)
                            log('Added message', body)
                        }
                    })
                },
            )

            const currentDate = new Date()
            const isoDateString = currentDate.toISOString()
            const messageText =
                crypto.getRandomValues(new Uint8Array(16)).toString() + ' ' + isoDateString
            await client.sendMessage(testChannelId, messageText)
            await healthcheckQueueLeader.add(fromLeaderQueueName, {
                commandType: 'messageSent',
                command: messageText,
            })
            log('First message sent')
            //Step 5 - wait for follower to be logged in
            await waitFor(
                () => {
                    expect(messagesSet.has('Mirror from Bot 2: ' + messageText)).toBe(true)
                },
                {
                    timeoutMS: loginWaitTime,
                },
            )
            log('Reply recieved')
            await client.stopSync()
            log('Done')
        },
        testRunTimeMs * 2,
    )
})

async function checkRedirectLocation(url: string): Promise<string | null> {
    try {
        const response = await fetch(url, { redirect: 'manual' })

        if (response.status >= 300 && response.status < 400) {
            // The response status indicates a redirect
            const locationHeader = response.headers.get('location')
            if (locationHeader) {
                // The "location" header contains the redirected URL
                return locationHeader
            }
        }

        // No redirect or location header found
        return null
    } catch (error) {
        // Handle fetch errors here
        return null
    }
}
