/**
 *
 * // https://www.npmjs.com/package/jest-runner-groups
 * @group integration/load
 *
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { registerAndStartClients, waitForWithRetries } from '../integration/helpers/TestUtils'

import { Worker, Queue } from 'bullmq'
import { waitFor } from '@testing-library/react'
import { RoomIdentifier } from '../../src/types/room-identifier'

import { TestConstants } from '../integration/helpers/TestConstants'

import { numberOfMessagesConfig, connectionOptions } from './loadconfig'
import fs from 'fs'

describe('loadtest1', () => {
    //Test is skipped until not fully implemented
    test('create room, invite user, accept invite, and send encrypted message', async () => {
        let startSignalRecieved = false
        let channelData: { spaceId: RoomIdentifier; channelId: RoomIdentifier }
        // Start listenting for message from the first part of the test which signals that data are ready
        const _worker = new Worker(
            'loadtestqueue',
            // eslint-disable-next-line
            async (job) => {
                startSignalRecieved = true

                channelData = job.data as { spaceId: RoomIdentifier; channelId: RoomIdentifier }
                return
            },
            { connection: connectionOptions },
        )

        await waitFor(() => expect(startSignalRecieved).toBeTruthy(), {
            timeout: 10000000,
            interval: 100,
        })

        const { alice } = await registerAndStartClients(['alice'])
        // Alice joins the space
        await alice.joinTown(channelData!.spaceId, alice.wallet)
        //Alice joins the channel
        await waitForWithRetries(() => alice.joinRoom(channelData!.channelId))

        const startTime = Date.now()

        await waitFor(() => {
            expect(alice.getEventsDescription(channelData.channelId)).toContain(
                'm_' + String(numberOfMessagesConfig - 1),
            )
        }, TestConstants.DoubleDefaultWaitForTimeout)

        const endTime = Date.now()
        console.log('Join channel time:', endTime - startTime)

        const myQueue = new Queue('shutdownqueue', { connection: connectionOptions })

        // Send a message to the queue to shut down first part of the test
        await myQueue.add('shutdownqueue', 'shut down signal')

        // Define metric properties
        const METRIC_NAME = 'loadtest:receiver.execution_time'
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
        // Timeout is set to 30 seconds until we get clean test results
        expect(endTime - startTime).toBeLessThan(30_000)
    }, 5000000) // end test
}) // end describe
