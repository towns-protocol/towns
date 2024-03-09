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
    followerKey,
    jsonRpcProviderUrl,
    fromFollowerQueueName,
    fromLeaderQueueName,
    riverNodeRpcUrl,
} from './30MinutesSyntheticConfig.test_util'
import { DecryptedContent } from '../encryptedContentTypes'
import { SnapshotCaseType } from '@river/proto'
import { DecryptedTimelineEvent } from '../types'
import { createSpaceDapp } from '@river/web3'

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

const healthcheckQueueFollower = new Queue(fromFollowerQueueName, {
    connection: connectionOptions,
})

describe('mirrorMessages', () => {
    test(
        'mirrorMessages',
        async () => {
            const messagesSet: Set<string> = new Set()
            const messagesMap: Map<string, DecryptedContent> = new Map()
            let commChannelId: string

            let leaderLoggedIn = false
            const replyWasSent = makeDonePromise()

            //Step 1 - Initialize worker to track follower status
            // eslint-disable-next-line
            const _followerWorker = new Worker(
                fromLeaderQueueName,
                // eslint-disable-next-line
                async (message) => {
                    const commandData = message.data as { commandType: string; command: any }
                    log('commandData', commandData)
                    if (commandData.commandType === 'leaderLoggedIn') {
                        leaderLoggedIn = true
                        log('leaderLoggedIn flag set to true')
                    }
                    if (commandData.commandType === 'messageSent') {
                        let eventFound = false
                        for (let i = 1; i <= 10; i++) {
                            log('Iteration ' + i + ' of 10')
                            if (messagesSet.has(commandData.command)) {
                                log('Event found')
                                eventFound = true
                                break
                            }
                            await new Promise((resolve) => setTimeout(resolve, 1000))
                        }
                        if (!eventFound) {
                            log('Event not found')
                            throw new Error('Event not found')
                        }
                        const clearEvent = messagesMap.get(commandData.command)
                        check(clearEvent?.kind === 'channelMessage')
                        if (
                            clearEvent.content?.payload?.case === 'post' &&
                            clearEvent.content?.payload?.value?.content?.case === 'text' &&
                            clearEvent.content?.payload?.value?.content.value?.body ===
                                commandData.command
                        ) {
                            await client.sendMessage(
                                commChannelId,
                                'Mirror from Bot 2: ' + commandData.command,
                            )
                            log(
                                'Reply message sent with text: ',
                                'Mirror from Bot 2: ' + commandData.command,
                            )
                            replyWasSent.done()
                        }
                    }
                    if (commandData.commandType === 'joinTown') {
                        const spaceDapp = createSpaceDapp({
                            chainId: (await walletWithProvider.provider.getNetwork()).chainId,
                            provider: walletWithProvider.provider,
                        })
                        const spaceAndChannelIds = commandData.command as {
                            townId: string
                            channelId: string
                        }
                        const hasMembership = await spaceDapp.hasTownMembership(
                            spaceAndChannelIds.townId,
                            walletWithProvider.address,
                        )
                        if (!hasMembership) {
                            // mint membership
                            const transaction = await spaceDapp.joinTown(
                                spaceAndChannelIds.townId,
                                walletWithProvider.address,
                                walletWithProvider,
                            )
                            await transaction.wait()
                        }

                        await client.joinStream(spaceAndChannelIds.townId)
                        await client.joinStream(spaceAndChannelIds.channelId)
                        commChannelId = spaceAndChannelIds.channelId
                        await healthcheckQueueFollower.add(fromFollowerQueueName, {
                            commandType: 'followerJoinedTown',
                            command: '',
                        })
                    }
                    return
                },
                { connection: connectionOptions, concurrency: 50 },
            )

            // set up the web3 provider and spacedap
            const followerWallet = new ethers.Wallet(followerKey)
            const provider = new ethers.providers.JsonRpcProvider(jsonRpcProviderUrl)
            const walletWithProvider = followerWallet.connect(provider)
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
            log('Wallet address:', followerWallet.address)
            log('Wallet address:', walletWithProvider.address)
            const startSyncResult = client.startSync()
            log('startSyncResult', startSyncResult)
            log('client', client.userId)

            await healthcheckQueueFollower.add(fromFollowerQueueName, {
                commandType: 'followerLoggedIn',
                command: '',
            })
            log('followerLoggedIn notification sent')
            //Step 3 - wait for follower to be logged in
            await waitFor(
                () => {
                    expect(leaderLoggedIn).toBe(true)
                },
                {
                    timeoutMS: loginWaitTime,
                },
            )
            log('Leader logged in notification recieved')
            client.on(
                'eventDecrypted',
                (
                    streamId: string,
                    contentKind: SnapshotCaseType,
                    event: DecryptedTimelineEvent,
                ): void => {
                    const clearEvent = event.decryptedContent
                    check(clearEvent.kind === 'channelMessage')
                    expect(clearEvent.content?.payload).toBeDefined()
                    if (
                        clearEvent.content?.payload?.case === 'post' &&
                        clearEvent.content?.payload?.value?.content?.case === 'text'
                    ) {
                        const body = clearEvent.content?.payload?.value?.content.value?.body
                        log('Event decrypted with text:', body)
                        messagesSet.add(body)
                        messagesMap.set(body, clearEvent)
                    }
                },
            )

            await replyWasSent.expectToSucceed()
            await client.stopSync()
            log('Successfully done')
        },
        testRunTimeMs * 2,
    )
})
