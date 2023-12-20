/**
 * @group load-tests-s3
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
    getUserStreamKey,
    multipleClientsJoinSpaceAndChannel,
    startMessageSendingWindow,
    wait,
} from './load_tests_util'

const base_log = dlog('csb:test:loadTestsS3')

const numOfClients = 3
const windowDuration = 10 * 60 * 1000 // 10 minutes
const totalDuration: number = 3 * 60 * 60 * 1000 // 3 hours
const waitMessageTimeout = 3000 // maximum time for a client to wait for a message sent by another client

const missingMessages: string[] = []
const keyDebugLog: string[] = []

type LoadTestMetadata = {
    [key: string]: any
}

describe('loadTestsScenario3', () => {
    test('create three users, space, channel, sent messages to the channel at random time in a 10 minutes window for 3 hours.', async () => {
        const log = base_log.extend('load_tests_s3')
        const loadTestMetadata: LoadTestMetadata = {
            windowDuration: windowDuration,
            windowNum: totalDuration / windowDuration,
            duration: totalDuration,
            clients: numOfClients,
        }

        log('start', loadTestMetadata)
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
        const channelId = bobClientSpaceChannel.channelId

        loadTestMetadata['spaceId'] = spaceId
        loadTestMetadata['channelId'] = channelId
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
        await multipleClientsJoinSpaceAndChannel(clientWalletInfos, spaceId, channelId)

        const createClientsAndJoinTownAndChannelEnd = Date.now()
        loadTestMetadata['createTwoClientsAndJoinTownAndChannelDuration'] =
            createClientsAndJoinTownAndChannelEnd - createClientsAndJoinTownAndChannelStart
        log('Create clients, join town and channel end', loadTestMetadata)

        const allClients = [
            bob,
            clientWalletInfos['client_0'].client,
            clientWalletInfos['client_1'].client,
        ]

        // map of <userId_streamId, messagesSent>
        const futureMessagesMap: Map<string, Set<string>> = new Map()

        function handleEventDecrypted(eventName: string, client: Client) {
            // eslint-disable-next-line
            client.on('eventDecrypted', async (streamId, contentKind, event) => {
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
                        log('')
                        if (messageSet.has(body)) {
                            messageSet.delete(body)
                        }
                    }
                    keyDebugLog.push(
                        `${getCurrentTime()} ${eventName}, client<${userStreamKey}> receives a message<${contentKind}>: ${body}`,
                    )
                }
            })
        }

        handleEventDecrypted('client0', allClients[0])
        handleEventDecrypted('client1', allClients[1])
        handleEventDecrypted('client2', allClients[2])

        const setUpTimeBeforeSendingMessages = Date.now() - loadTestStartTime
        loadTestMetadata['setUpTimeBeforeSendingMessages'] = setUpTimeBeforeSendingMessages
        log('Set up time since start and before scheduling sending messages:', loadTestMetadata)

        log('Schedule sending messsages start')
        keyDebugLog.push(`${getCurrentTime()} Schedule sending messages start`)

        for (let interval = 0; interval < totalDuration; interval += windowDuration) {
            const windowIndex = interval / windowDuration
            log('Schedule sending channel message', { interval: interval, window: windowIndex })

            setTimeout(
                () =>
                    startMessageSendingWindow(
                        'channelContent',
                        windowIndex,
                        allClients,
                        channelId,
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
            }, interval + windowDuration)
        }
        keyDebugLog.push(`${getCurrentTime()} Schedule sending messsages done`)
        log('Schedule sending messsages done', loadTestMetadata)

        function verifyMessagesReceivedByEndOfWindow(
            messagesSentPerUserMap: Map<string, Set<string>>,
            windowIndex: number,
        ) {
            log(`start verifyMessagesReceivedByEndOfWindow<${windowIndex}>`)
            messagesSentPerUserMap.forEach((sentMessagesSet, userStreamKey) => {
                if (sentMessagesSet.size === 0) {
                    log(`Verification success for ${userStreamKey} in window<${windowIndex}>`)
                } else {
                    log(
                        `Verification failure for ${userStreamKey} in window<${windowIndex}>`,
                        sentMessagesSet,
                    )
                    sentMessagesSet.forEach((message) => {
                        missingMessages.push(
                            `Verification for ${userStreamKey} in window<${windowIndex}>, missing message: ${message}`,
                        )
                    })
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
                            `Non-empty set found for key ${key}, with ${messageSet.size} messages, which means those messages are not received.`,
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
        log('Done', { loadTestMetadata: loadTestMetadata, missingMessages: missingMessages })
    })
})
