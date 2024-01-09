/**
 * @group load-tests-s2
 */

import { check, dlog } from '@river/mecholm'
import { makeDonePromise } from '../util.test'
// eslint-disable-next-line import/no-extraneous-dependencies
import { waitFor } from '@testing-library/react'

import {
    numMessagesConfig,
    connectionOptions,
    loadTestSignalCheckInterval,
    loadTestTimeout,
    loadTestQueueName,
    loadTestShutdownQueueName,
    loadTestReceiverTimeout,
    chainSpaceAndChannelJobName,
    alicesAccount,
    jsonRpcProviderUrl,
    nodeRpcURL,
} from './loadconfig'
import { Queue, Worker } from 'bullmq'
import fs from 'fs'
import { SnapshotCaseType } from '@river/proto'
import { DecryptedTimelineEvent } from '../types'
import { createAndStartClient } from './load_tests_util'
import { RiverSDK } from '../testSdk'

const { createSpaceDapp } = await import('@river/web3')

const base_log = dlog('csb:test:loadTestsS2')

describe('loadTestsScenario2', () => {
    test(
        'Listen to initiator signal, join space and channel, and listen to new messages in the channel',
        async () => {
            const log = base_log.extend('receiver')

            let startSignalRecieved = false
            let chainSpaceChannelData: { chainId: number; spaceId: string; channelId: string } = {
                chainId: 0,
                spaceId: '',
                channelId: '',
            }

            log('start')
            new Worker(
                loadTestQueueName,
                async (job) => {
                    if (job.name === chainSpaceAndChannelJobName) {
                        startSignalRecieved = true
                        log(`Received an unexpected job.data: ${job.data}`)
                        chainSpaceChannelData = job.data as {
                            chainId: number
                            spaceId: string
                            channelId: string
                        }
                    } else {
                        log(`Received an unexpected job type: ${job.name}`)
                    }
                    startSignalRecieved = true
                    return
                },
                { connection: connectionOptions },
            )
            await waitFor(() => expect(startSignalRecieved).toBeTruthy(), {
                timeout: loadTestReceiverTimeout,
                interval: loadTestSignalCheckInterval,
            })

            log('now we have chainSpaceChannelData', chainSpaceChannelData)

            // register new client
            const aliceClientWalletInfo = await createAndStartClient(
                alicesAccount,
                jsonRpcProviderUrl,
                nodeRpcURL,
            )
            const alice = aliceClientWalletInfo.client
            const provider = aliceClientWalletInfo.provider
            const walletWithProvider = aliceClientWalletInfo.walletWithProvider
            const network = await provider.getNetwork()

            // alice joins the space
            const alicesSpaceDapp = createSpaceDapp({ chainId: network.chainId, provider })
            const alicesRiverSDK = new RiverSDK(alicesSpaceDapp, alice, walletWithProvider)
            await alicesRiverSDK.joinTown(chainSpaceChannelData.spaceId)

            // alice joins the channel
            const startTime = Date.now()
            await alicesRiverSDK.joinChannel(chainSpaceChannelData.channelId)

            const aliceGetsMessage = makeDonePromise()
            alice.on(
                'eventDecrypted',
                (
                    streamId: string,
                    contentKind: SnapshotCaseType,
                    event: DecryptedTimelineEvent,
                ): void => {
                    const channelId = streamId
                    const content = event.decryptedContent.content
                    expect(content).toBeDefined()
                    log('eventDecrypted', 'Bob', channelId)
                    aliceGetsMessage.runAsync(async () => {
                        const clearEvent = event.decryptedContent
                        check(clearEvent?.kind === 'channelMessage')
                        expect(clearEvent.content.payload).toBeDefined()
                        if (
                            clearEvent.content?.payload?.case === 'post' &&
                            clearEvent.content?.payload?.value?.content?.case === 'text'
                        ) {
                            const body = clearEvent.content?.payload?.value?.content.value?.body
                            log('Receiver client message body:', body)
                            const message = 'm_' + String(numMessagesConfig - 1)
                            // Wait for the first client sends all messages
                            if (body.includes(message)) {
                                aliceGetsMessage.done()
                            }
                        }
                    })
                },
            )

            await aliceGetsMessage.expectToSucceed()

            const endTime = Date.now()
            log('Receiver wait total time', endTime - startTime)

            // Send first message
            await alice.sendMessage(
                chainSpaceChannelData.channelId,
                "This is alice, I'm the 11th user.",
            )

            const myQueue = new Queue(loadTestShutdownQueueName, { connection: connectionOptions })
            // Send a message to the queue to shut down first part of the test
            await myQueue.add(loadTestShutdownQueueName, 'shut down signal')

            // Define metric properties
            const METRIC_NAME = 'sdk-loadtest:receiver.execution_time'
            const METRIC_VALUE = endTime - startTime
            const HOSTNAME = 'github-actions'
            const TAGS = 'environment:ci'

            // Create the metric data
            const payload = {
                series: [
                    {
                        metric: METRIC_NAME,
                        points: [[Math.floor(Date.now() / 1000), METRIC_VALUE]],
                        type: 'gauge',
                        host: HOSTNAME,
                        tags: [TAGS],
                    },
                ],
            }

            fs.writeFileSync('loadtestMetrics.json', JSON.stringify(payload))
            // Timeout until we get clean test results, it's based on numMessagesConfig
            // we wait for the first client sends all messages
            // assume 0.1s for sending a message, it will be roughly 10s for 100 and 1000s 10000
            expect(endTime - startTime).toBeLessThan(1050_000)

            alice.stopSync()
            log('Done', {
                spaceId: chainSpaceChannelData.spaceId,
                channelId: chainSpaceChannelData.channelId,
            })
        },
        loadTestTimeout,
    )
})
