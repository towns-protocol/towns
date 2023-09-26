/**
 *
 * // https://www.npmjs.com/package/jest-runner-groups
 * @group integration/load2
 *
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { registerAndStartClients, waitForWithRetries } from '../integration/helpers/TestUtils'

import { Worker, Queue } from 'bullmq'
import { waitFor } from '@testing-library/react'
import { RoomIdentifier } from '../../src/types/room-identifier'

import { TestConstants } from '../integration/helpers/TestConstants'

import { numberOfMessagesConfig, connectionOptions } from './loadconfig'

import axios from 'axios'

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
        await alice.joinRoom(channelData!.spaceId)

        //Alice joins the channel
        await waitForWithRetries(() => alice.joinRoom(channelData!.channelId))

        const startTime = Date.now()

        await waitFor(() => {
            expect(alice.getEventsDescription(channelData.channelId)).toContain(
                'm_' + String(numberOfMessagesConfig - 1),
            )
        }, TestConstants.DoubleDefaultWaitForTimeout)

        const endTime = Date.now()
        console.log(endTime - startTime)

        const myQueue = new Queue('shutdownqueue', { connection: connectionOptions })

        // Send a message to the queue to shut down first part of the test
        await myQueue.add('shutdownqueue', 'shut down signal')

        //Send metric to Datadog
        const API_KEY = process.env.DATADOG_API_KEY
        // Define metric properties
        const METRIC_NAME = 'loadtest_1.execution_time'
        const METRIC_VALUE = endTime - startTime
        const HOSTNAME = 'my_host'
        const TAGS = 'environment:test'

        // Datadog API endpoint
        const DATADOG_API_URL = 'https://api.datadoghq.com/api/v1/series'

        // Create the metric data
        const metricData = {
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

        // Set up the Axios request configuration
        const axiosConfig = {
            headers: {
                'Content-type': 'application/json',
            },
            params: {
                api_key: API_KEY,
            },
        }

        // Send metric to Datadog using Axios
        await axios.post(DATADOG_API_URL, metricData, axiosConfig)

        expect(endTime - startTime).toBeLessThan(500)
    }, 5000000) // end test
}) // end describe
