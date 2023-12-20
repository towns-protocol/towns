/**
 * @group load-tests-s4.1
 */

import { dlog } from '../dlog'
import { waitFor } from '../util.test'
import { bobsAccount, accounts, jsonRpcProviderUrl, nodeRpcURL } from './loadconfig'
import { Client } from '../client'
import { check } from '../check'
import {
    createAndStartClients,
    createClientSpaceAndChannel,
    extractComponents,
    getCurrentTime,
    getRandomSubset,
    getUserStreamKey,
    multipleClientsJoinSpaceAndChannel,
    sendMessageAfterRandomDelay,
    wait,
} from './load_tests_util'

const base_log = dlog('csb:test:loadTestsS4.1')

const windowDuration = 60 * 1000 // 1 minute
const totalDuration: number = 3 * 60 * 60 * 1000 // 3 hours
const waitMessageTimeout = 3000 // maximum time for a client to wait for a message sent by another client

const keyDebugLog: string[] = []

type LoadTestMetadata = {
    [key: string]: any
}

describe('loadTestsScenario: Test application stability during long period of time under higher load. This scenario is supposed to be running for 3 hours and midnight PST for the first phase.', () => {
    test('create three users, space, channel, sent DM and GDM messages at random time in a minute window for 3 hours.', async () => {
        const log = base_log.extend('load_test_s4.1')
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
        const spaceId = bobClientSpaceChannel.spaceId

        loadTestMetadata['spaceId'] = spaceId
        log('Create clients start', loadTestMetadata)
        const createClientsAndJoinTownAndChannelStart = Date.now()
        const clientWalletInfos = await createAndStartClients(
            accounts,
            jsonRpcProviderUrl,
            nodeRpcURL,
        )
        const allClients: Client[] = []

        Object.keys(clientWalletInfos).map((key) => {
            const clientWalletInfo = clientWalletInfos[key]
            allClients.push(clientWalletInfo.client)
        })
        const createClientsEnd = Date.now()
        loadTestMetadata['createClientsDuration'] =
            createClientsEnd - createClientsAndJoinTownAndChannelStart
        log('Create clients end', loadTestMetadata)
        await multipleClientsJoinSpaceAndChannel(
            clientWalletInfos,
            spaceId,
            bobClientSpaceChannel.channelId,
        )
        const createClientsAndJoinTownAndChannelEnd = Date.now()
        loadTestMetadata['createTwoClientsAndJoinTownAndChannelDuration'] =
            createClientsAndJoinTownAndChannelEnd - createClientsAndJoinTownAndChannelStart
        log('Create clients, join town and channel end', loadTestMetadata)

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
                                log(
                                    `client<${userStreamKey}> messageSet delete content successfully:`,
                                    body,
                                )
                            } else {
                                log(
                                    `client<${userStreamKey}> messageSet does not have the content`,
                                    messageSet,
                                )
                            }
                        } else {
                            log(`client<<${userStreamKey}> messageSet is null in futureMessagesMap`)
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

        for (const client of allClients) {
            handleEventDecrypted('', client)
        }

        const setUpTimeBeforeSendingMessages = Date.now() - loadTestStartTime
        loadTestMetadata['setUpTimeBeforeSendingMessages'] = setUpTimeBeforeSendingMessages
        log('Set up time since start and before scheduling sending messages:', loadTestMetadata)

        log('Schedule sending messages start')
        keyDebugLog.push(`${getCurrentTime()} Schedule sending messages start`)

        for (let interval = 0; interval < totalDuration; interval += windowDuration) {
            const windowIndex = interval / windowDuration
            log('Schedule sending GDM message', { interval: interval, window: windowIndex })

            const actionPerMinute = 6
            for (let a = 0; a < actionPerMinute; a += 1) {
                setTimeout(
                    () =>
                        void startMessageSendingGDMWindow(
                            windowIndex,
                            allClients,
                            futureMessagesMap,
                            windowDuration,
                        ),
                    interval,
                )

                log('Schedule sending DM message', { interval: interval, window: windowIndex })
                setTimeout(
                    () =>
                        void startMessageSendingDMWindow(
                            windowIndex,
                            allClients,
                            futureMessagesMap,
                            windowDuration,
                        ),
                    interval,
                )
            }
        }
        keyDebugLog.push(`${getCurrentTime()} Schedule sending messsages done`)
        log('Schedule sending messsages done', loadTestMetadata)
        await wait(totalDuration + windowDuration + waitMessageTimeout) // 183000
        await waitFor(
            () => {
                let allMessagesReceived = true
                for (const [key, messageSet] of futureMessagesMap) {
                    if (messageSet.size > 0) {
                        log(
                            `Non-empty set found for key ${key}, with ${messageSet.size} messages.`,
                            messageSet,
                        )
                        allMessagesReceived = false
                        break
                    }
                }
                expect(allMessagesReceived).toBe(true)
            },
            {
                timeoutMS: waitMessageTimeout + 30_000,
            },
        )
        log('keyDebugLog:', { keyDebugLog: keyDebugLog })
        log('Stop clients')
        // kill the clients
        for (const client of allClients) {
            client.stopSync()
        }
        const loadTestEndTime = Date.now()
        loadTestMetadata['loadTestS4.1Duration'] = loadTestEndTime - loadTestStartTime
        log('Done', loadTestMetadata)
    })

    const startMessageSendingDMWindow = async (
        windowIndex: number,
        allClients: Client[],
        messagesSentPerUserMap: Map<string, Set<string>>,
        windownDuration: number,
    ) => {
        const twoClients = getRandomSubset(allClients, 2)
        if (twoClients) {
            const senderClient = twoClients[0]
            const receiptClient = twoClients[1]
            const dmChannelReturnVal = await senderClient.createDMChannel(receiptClient.userId)
            await expect(senderClient.waitForStream(dmChannelReturnVal.streamId)).toResolve()
            await expect(receiptClient.joinStream(dmChannelReturnVal.streamId)).toResolve()
            sendMessageAfterRandomDelay(
                'dmChannelContent',
                senderClient,
                [receiptClient.userId],
                dmChannelReturnVal.streamId,
                windowIndex.toString(),
                messagesSentPerUserMap,
                windownDuration,
            )
        }
    }

    const startMessageSendingGDMWindow = async (
        windowIndex: number,
        allClients: Client[],
        messagesSentPerUserMap: Map<string, Set<string>>,
        windownDuration: number,
    ) => {
        // Pick random clients
        const num = 3 // We can also pick a random number from 3 to maximum of allClients
        const gdmClients = getRandomSubset(allClients, num)
        const creatorClient = gdmClients[0]
        const userIds = gdmClients.slice(1, num).map((client) => client.userId)

        // Create GDM
        const { streamId } = await creatorClient.createGDMChannel(userIds)
        const senderStream = await creatorClient.getStream(streamId)

        for (let i = 0; i < gdmClients.length; i++) {
            const client = gdmClients[i]
            // Ensure everyone joins GDM
            if (
                creatorClient.userId !== client.userId &&
                !senderStream.getMemberships().joinedUsers.has(client.userId)
            ) {
                await expect(client.joinStream(streamId)).toResolve()
            }
        }

        // Pick a sender client
        const senderClient = getRandomSubset(gdmClients, 1)[0]
        const recipients = gdmClients.map((client) => client.userId)

        sendMessageAfterRandomDelay(
            'gdmChannelContent',
            senderClient,
            recipients,
            streamId,
            windowIndex.toString(),
            messagesSentPerUserMap,
            windownDuration,
        )
    }
})
