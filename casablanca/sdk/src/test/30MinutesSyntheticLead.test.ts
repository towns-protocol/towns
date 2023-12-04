/**
 * @group synthetic
 */

import { dlog } from '../dlog'
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
    testChannelId,
    connectionOptions,
    loginWaitTime,
    leaderKey,
    jsonRpcProviderUrl,
    nodeRpcURL,
    fromFollowerQueueName,
    fromLeaderQueueName,
} from './30MinutesSyntheticConfig'
import { DecryptedTimelineEvent } from '../types'
import { SnapshotCaseType } from '@river/proto'

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

const healthcheckQueueLeader = new Queue(fromLeaderQueueName, {
    connection: connectionOptions,
})

describe('mirrorMessages', () => {
    test(
        'mirrorMessages',
        async () => {
            let followerLoggedIn = false

            //Step 1 - Initialize worker to track follower status
            // eslint-disable-next-line
            const _leadWorker = new Worker(
                fromFollowerQueueName,
                // eslint-disable-next-line
                async (command) => {
                    const commandData = command.data as { commandType: string; messageTest: string }
                    log('commandData', commandData)
                    if (commandData.commandType === 'followerLoggedIn') {
                        followerLoggedIn = true
                        log('followerLoggedIn flag set to true')
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

            const rpcClient = makeStreamRpcClient(nodeRpcURL)
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
            const startSyncResult = await client.startSync()
            log('startSyncResult', startSyncResult)
            log('client', client.userId)

            await healthcheckQueueLeader.add(fromLeaderQueueName, {
                commandType: 'leaderLoggedIn',
                messageTest: '',
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

            //Step 4 - send message
            const done = makeDonePromise()
            client.on(
                'eventDecrypted',
                (
                    streamId: string,
                    contentKind: SnapshotCaseType,
                    event: DecryptedTimelineEvent,
                ): void => {
                    done.runAsync(async () => {
                        // await client.decryptEventIfNeeded(event)
                        const clearEvent = event.decryptedContent
                        expect(clearEvent?.content?.payload).toBeDefined()
                        expect(clearEvent.kind).toEqual('channelMessage')
                        if (
                            clearEvent?.content?.payload?.case === 'post' &&
                            clearEvent?.content?.payload?.value?.content?.case === 'text'
                        ) {
                            const body = clearEvent?.content?.payload?.value?.content.value?.body
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
                messageTest: messageText,
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
            log('Done')
        },
        testRunTimeMs * 2,
    )
})
