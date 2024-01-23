/**
 * @group load-tests-3.1
 */

import { check, dlog } from '@river/waterproof'
import { waitFor } from '../util.test'
import { bobsAccount, accounts, jsonRpcProviderUrl, nodeRpcURL } from './loadconfig'
import { Client } from '../client'
import {
    createAndStartClients,
    createClientSpaceAndChannel,
    getCurrentTime,
    multipleClientsJoinSpaceAndChannel,
    sendMessageAfterRandomDelay,
    wait,
    extractComponents,
    getUserStreamKey,
    getRandomElement,
} from './load_tests_util'

const base_log = dlog('csb:test:loadTestsS3.1')

const windowDuration = 60 * 1000 // 1 minute
const totalDuration: number = 10 * 60 * 1000 // 10 minutes
const waitMessageTimeout = 3000 // maximum time for a client to wait for a message sent by another client
const keyDebugLog: string[] = []

type LoadTestMetadata = {
    [key: string]: any
}

describe('loadTestsScenario: Main focus of this scenario is testing of DMs and GDMs. This scenario is supposed to be running for 10 minutes at 01:00 PST', () => {
    test('create three users, space, channel, sent messages to the channel at random time in a 10 minutes window for 3 hours.', async () => {
        const log = base_log.extend('load_test_s3.1')
        const loadTestMetadata: LoadTestMetadata = {
            windowDuration: windowDuration,
            windowNum: totalDuration / windowDuration,
            duration: totalDuration,
        }

        log('Start test', loadTestMetadata)
        const loadTestStartTime = Date.now()

        const bobClientSpaceChannel = await createClientSpaceAndChannel(
            bobsAccount,
            jsonRpcProviderUrl,
            nodeRpcURL,
        )
        loadTestMetadata['client1CreateClientSpaceAndChannelDuration'] =
            Date.now() - loadTestStartTime
        const bob = bobClientSpaceChannel.client
        const spaceId = bobClientSpaceChannel.spaceId

        loadTestMetadata['spaceId'] = spaceId
        log('Create clients start', loadTestMetadata)
        const createClientsAndJoinTownAndChannelStart = Date.now()
        // create two new clients
        const clientWalletInfos = await createAndStartClients(
            accounts.slice(0, 2),
            jsonRpcProviderUrl,
            nodeRpcURL,
        )
        const createClientsEnd = Date.now()
        loadTestMetadata['createTwoClientsDuration'] =
            createClientsEnd - createClientsAndJoinTownAndChannelStart
        log('Create clients end', loadTestMetadata)
        // two new clients join town and channel
        await multipleClientsJoinSpaceAndChannel(clientWalletInfos, spaceId, undefined)

        const createClientsAndJoinTownAndChannelEnd = Date.now()
        loadTestMetadata['createTwoClientsAndJoinTownAndChannelDuration'] =
            createClientsAndJoinTownAndChannelEnd - createClientsAndJoinTownAndChannelStart
        log('Create clients, join town and channel end', loadTestMetadata)

        const alice = clientWalletInfos['client_0'].client
        const charlie = clientWalletInfos['client_1'].client

        const allClients = [bob, alice, charlie]

        const userIds = [alice.userId, charlie.userId]
        loadTestMetadata['userIds'] = userIds
        log('Create gdm channel', loadTestMetadata)
        const { streamId } = await bob.createGDMChannel(userIds)
        const channelId = streamId
        loadTestMetadata['channelId'] = channelId

        log('Ensure bob joins stream', loadTestMetadata)
        await expect(bob.waitForStream(streamId)).toResolve()
        const bobsStream = await bob.getStream(streamId)
        log('bobsStream.getMemberships().joinedUsers:', bobsStream.getMemberships().joinedUsers)
        if (!bobsStream.getMemberships().joinedUsers.has(alice.userId)) {
            log('Ensure alice joins stream', loadTestMetadata)
            await expect(alice.joinStream(streamId)).toResolve()
        } else {
            log('alice already joined stream', loadTestMetadata)
        }
        if (!bobsStream.getMemberships().joinedUsers.has(alice.userId)) {
            log('Ensure charlie joins stream', loadTestMetadata)
            await expect(charlie.joinStream(streamId)).toResolve()
        } else {
            log('charlie already joined stream', loadTestMetadata)
        }

        log('Everyone join stream', loadTestMetadata)

        const futureMessagesMap: Map<string, Set<string>> = new Map()

        function handleEventDecrypted(eventName: string, client: Client) {
            // eslint-disable-next-line
            client.on('eventDecrypted', async (streamId, contentKind, event) => {
                const createdAtEpocMs = Number(event.createdAtEpocMs)

                // if it's an existing DM, previous message will also be loaded, skip those messages
                if (createdAtEpocMs > loadTestStartTime) {
                    log('handleEventDecrypted new', {
                        streamId: streamId,
                        contentKind: contentKind,
                        event: event,
                    })
                    const clearEvent = event.decryptedContent
                    check(clearEvent.kind === 'channelMessage')
                    expect(clearEvent.content.payload).toBeDefined()

                    if (
                        clearEvent.content.payload?.case === 'post' &&
                        clearEvent.content.payload?.value?.content?.case === 'text'
                    ) {
                        const body = clearEvent.content.payload.value.content.value.body
                        const userStreamKey = getUserStreamKey(client.userId, streamId)

                        const returnVal = extractComponents(body)
                        const endTimestamp = Date.now()
                        const duration = endTimestamp - returnVal.startTimestamp
                        const messageStat = {
                            streamId: returnVal.streamId,
                            startTimestamp: returnVal.startTimestamp,
                            endTimestamp: endTimestamp,
                            duration: duration,
                        }
                        log(
                            `${eventName}, client<${userStreamKey}> receives a message<${contentKind}>: ${body}`,
                            messageStat,
                        )

                        const messageSet = futureMessagesMap.get(userStreamKey)
                        if (messageSet) {
                            if (messageSet.has(body)) {
                                messageSet.delete(body)
                            }
                        }
                        keyDebugLog.push(
                            `${getCurrentTime()} ${eventName}, client<${userStreamKey}> receives a message<${contentKind}>: ${body}`,
                        )
                    }
                } else {
                    log('handleEventDecrypted skip previous message', {
                        streamId: streamId,
                        contentKind: contentKind,
                        event: event,
                    })
                }
            })
        }

        handleEventDecrypted('client0', allClients[0])
        handleEventDecrypted('client1', allClients[1])
        handleEventDecrypted('client2', allClients[2])

        const setUpTimeBeforeSendingMessages = Date.now() - loadTestStartTime
        loadTestMetadata['setUpTimeBeforeSendingMessages'] = setUpTimeBeforeSendingMessages
        log('Set up time since start and before scheduling sending messages:', loadTestMetadata)

        const dmChannelReturnVal = await bob.createDMChannel(alice.userId)
        await expect(bob.waitForStream(dmChannelReturnVal.streamId)).toResolve()
        await expect(alice.joinStream(dmChannelReturnVal.streamId)).toResolve()

        log('Schedule sending messages start')
        keyDebugLog.push(`${getCurrentTime()} Schedule sending messages start`)

        for (let interval = 0; interval < totalDuration; interval += windowDuration) {
            const windowIndex = interval / windowDuration
            log('Schedule sending GDM message', { interval: interval, window: windowIndex })

            setTimeout(
                () =>
                    startMessageSendingGDMWindow(
                        windowIndex,
                        allClients,
                        channelId,
                        futureMessagesMap,
                        windowDuration,
                    ),
                interval,
            )

            log('Schedule sending DM message', { interval: interval, window: windowIndex })
            setTimeout(
                () =>
                    startMessageSendingDMWindow(
                        windowIndex,
                        allClients.slice(0, 2), // Only for bob and alice for now
                        dmChannelReturnVal.streamId,
                        futureMessagesMap,
                        windowDuration,
                    ),
                interval,
            )

            log('Schedule verifyMessagesReceivedByEndOfWindow', {
                interval: interval,
                window: windowIndex,
            })
            setTimeout(() => {
                verifyMessagesReceivedByEndOfWindow(futureMessagesMap, windowIndex)
            }, interval + waitMessageTimeout) // add 3s for an extra buffer to ensure we receive and process messages
        }

        keyDebugLog.push(`${getCurrentTime()} Schedule sending messsages done`)
        log('Schedule sending messsages done', loadTestMetadata)

        function verifyMessagesReceivedByEndOfWindow(
            messagesSentPerUserMap: Map<string, Set<string>>,
            windowIndex: number,
        ) {
            log(`start verifyMessagesReceivedByEndOfWindow<${windowIndex}>`)
            keyDebugLog.push(
                `${getCurrentTime()} start verifyMessagesReceivedByEndOfWindow<${windowIndex}>`,
            )

            messagesSentPerUserMap.forEach((sentMessagesSet, userStreamKey) => {
                if (sentMessagesSet.size === 0) {
                    log(`Verification success for ${userStreamKey} in window<${windowIndex}>`)
                } else {
                    log(
                        `Verification failure for ${userStreamKey} in window<${windowIndex}>`,
                        sentMessagesSet,
                    )
                }
            })
        }

        log('Start wait verifyMessagesReceivedByEndOfWindow ...')
        await wait(totalDuration + windowDuration + waitMessageTimeout)
        await waitFor(
            () => {
                let allMessagesReceived = true
                for (const [key, messageSet] of futureMessagesMap) {
                    if (messageSet.size > 0) {
                        log(
                            `Non-empty set found for key ${key}, with ${messageSet.size} messages, which means those message are not received.`,
                            messageSet,
                        )
                        allMessagesReceived = false
                        break
                    }
                }
                expect(allMessagesReceived).toBe(true)
            },
            {
                timeoutMS: waitMessageTimeout,
            },
        )

        log('keyDebugLog:', { keyDebugLog: keyDebugLog })
        log('Stop clients')
        // kill the clients
        for (const client of allClients) {
            client.stopSync()
        }
        const loadTestEndTime = Date.now()
        loadTestMetadata['loadTestS3Duration'] = loadTestEndTime - loadTestStartTime
        log('Done', loadTestMetadata)
    })

    const startMessageSendingDMWindow = (
        windowIndex: number,
        clients: Client[],
        channelId: string,
        messagesSentPerUserMap: Map<string, Set<string>>,
        windownDuration: number,
    ): void => {
        const recipients = clients.map((client) => client.userId)
        for (let i = 0; i < clients.length; i++) {
            const client = getRandomElement(clients)
            if (client) {
                sendMessageAfterRandomDelay(
                    'dmChannelContent',
                    client,
                    recipients,
                    channelId,
                    windowIndex.toString(),
                    messagesSentPerUserMap,
                    windownDuration,
                )
            }
        }
    }

    const startMessageSendingGDMWindow = (
        windowIndex: number,
        clients: Client[],
        channelId: string,
        messagesSentPerUserMap: Map<string, Set<string>>,
        windownDuration: number,
    ): void => {
        const recipients = clients.map((client) => client.userId)
        for (let i = 0; i < clients.length; i++) {
            const client = clients[i]
            sendMessageAfterRandomDelay(
                'gdmChannelContent',
                client,
                recipients,
                channelId,
                windowIndex.toString(),
                messagesSentPerUserMap,
                windownDuration,
            )
        }
    }
})
