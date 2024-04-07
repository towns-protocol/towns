/**
 *
 * // https://www.npmjs.com/package/jest-runner-groups
 * @group integration/load
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceGatedByTownNft,
    registerAndStartClients,
    waitForWithRetries,
} from '../integration/helpers/TestUtils'

import { waitFor } from '@testing-library/react'

import { Permission } from '@river-build/web3'

import { numberOfMessagesConfig, numClientsConfig, connectionOptions } from './loadconfig'

import { Queue, Worker } from 'bullmq'

describe('loadtest1', () => {
    test('create space, create channel, add #numClients users, send #numberOfMessages each, send signal to second jest', async () => {
        // Create a BullMQ queue instance to communicate with the second running test
        const myQueue = new Queue('loadtestqueue', { connection: connectionOptions })
        // Create clients
        const names = Array.from(Array(numClientsConfig).keys()).map((i) => `client_${i}`)
        const clients = await registerAndStartClients(names)

        //Bob is a user which will create space and channel
        const bob = clients['client_0']

        // Bob creates a space
        await bob.fundWallet()

        // First user (Bob) creates a space
        const spaceId = await createTestSpaceGatedByTownNft(
            bob,
            [Permission.Read, Permission.Write],
            {
                name: bob.makeUniqueName(),
            },
        )

        // First user (Bob) creates a channel
        const channelId = await createTestChannelWithSpaceRoles(bob, {
            name: 'bobs channel',
            parentSpaceId: spaceId,
            roleIds: [],
        })

        // All other users join the space
        const joinTownPromises: Promise<unknown>[] = []

        for (let i = 1; i < numClientsConfig; i++) {
            const client = clients[`client_${i}`]
            joinTownPromises.push(client.joinTown(spaceId, client.wallet))
            console.log(`join town ${i}`)
        }

        await Promise.all(joinTownPromises)

        const joinRoomPromises: Promise<unknown>[] = []

        for (let i = 1; i < numClientsConfig; i++) {
            const client = clients[`client_${i}`]
            joinRoomPromises.push(waitForWithRetries(() => client.joinRoom(channelId)))
            console.log(`join room ${i}`)
        }

        await Promise.all(joinRoomPromises)
        const startTime = Date.now()
        console.log(
            'Start populating channal that has ',
            numClientsConfig,
            ' users with ',
            numberOfMessagesConfig,
            ' messages per user',
        )
        // Each of numClients users sends numberOfMessages message to the channel to prepare test data
        for (let i = 0; i < numClientsConfig; i++) {
            const client = clients[`client_${i}`]
            for (let j = 0; j < numberOfMessagesConfig; j++) {
                await client.sendMessage(channelId, `Message m_${j} from ${i} with number `)
                console.log(`send message ${j} from ${i}`)
            }
            console.log(
                'Sending Message Progress',
                (((i + 1) * 100) / numClientsConfig).toFixed(2),
                '%',
            )
            console.log('Time elapsed: ', Date.now() - startTime, 'ms')
        }

        const spaceAndChannel = {
            spaceId,
            channelId,
        }

        // Send a message to the queue to signal another part of the test to join channel and get messages
        const result = await myQueue.add('spaceAndChannelData', spaceAndChannel)

        let shutdownSignalRecieved = false

        // Start listenting for a message from another part of the test that it is done and we can shutdown this part of the test
        // Otherwise test fails as if this part shuts down earleir keys for decryption can not be shared
        // eslint-disable-next-line
        const _worker = new Worker(
            'shutdownqueue',
            // eslint-disable-next-line
            async (job) => {
                shutdownSignalRecieved = true
                return
            },
            { connection: connectionOptions },
        )

        // Wait for signal to be recieved
        await waitFor(() => expect(shutdownSignalRecieved).toBeTruthy(), {
            timeout: 5000000,
            interval: 100,
        })
        console.log(result)
    }, 5000000) // end test
}) // end describe
