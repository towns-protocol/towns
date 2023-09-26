/**
 *
 * // https://www.npmjs.com/package/jest-runner-groups
 * @group integration/load
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceWithEveryoneRole,
    registerAndStartClients,
    waitForWithRetries,
} from '../integration/helpers/TestUtils'

import { waitFor } from '@testing-library/react'

import { Permission } from '@river/web3'
import { RoomVisibility } from '../../src/types/zion-types'
import { RoomIdentifier } from '../../src/types/room-identifier'

import { numberOfMessagesConfig, numClientsConfig, connectionOptions } from './loadconfig'

import { Queue, Worker } from 'bullmq'

describe('loadtest1', () => {
    test('create space, create channel, add #numClients users, send #numberOfMessages each, send signal to second jest', async () => {
        // Create a BullMQ queue instance to communicate with the second running test
        const myQueue = new Queue('loadtestqueue', { connection: connectionOptions })

        const numClients = process.env.NUM_CLIENTS
            ? parseInt(process.env.NUM_CLIENTS, 10)
            : numClientsConfig //Numner of clients which will send messages to channel
        const numberOfMessages = numberOfMessagesConfig //Total number of messages to send per user

        // Create clients
        const names = Array.from(Array(numClients).keys()).map((i) => `client_${i}`)
        const clients = await registerAndStartClients(names)

        //Bob is a user which will create space and channel
        const bob = clients['client_0']

        // Bob creates a space
        await bob.fundWallet()

        // First user (Bob) creates a space
        const spaceId = (await createTestSpaceWithEveryoneRole(
            bob,
            [Permission.Read, Permission.Write],
            {
                name: bob.makeUniqueName(),
                visibility: RoomVisibility.Public,
            },
        ))!

        // First user (Bob) creates a channel
        const channelId = (await createTestChannelWithSpaceRoles(bob, {
            name: 'bobs channel',
            parentSpaceId: spaceId,
            visibility: RoomVisibility.Public,
            roleIds: [],
        })) as RoomIdentifier

        // All other users join the space
        const promises: never[] = []

        for (let i = 1; i < numClients; i++) {
            const client = clients[`client_${i}`]
            promises.push(client.joinRoom(spaceId) as never)
        }

        await Promise.all(promises)

        // All other users join the channel
        promises.splice(0)

        for (let i = 1; i < numClients; i++) {
            const client = clients[`client_${i}`]
            promises.push(waitForWithRetries(() => client.joinRoom(channelId)) as never)
        }

        await Promise.all(promises)

        // Each of numClients users sends numberOfMessages message to the channel to prepare test data
        for (let i = 0; i < numClients; i++) {
            const client = clients[`client_${i}`]
            for (let j = 0; j < numberOfMessages; j++) {
                await client.sendMessage(channelId, `Message m_${j} from ${i} with number `)
            }
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
            timeout: 1000000,
            interval: 100,
        })
        console.log(result)
    }, 5000000) // end test
}) // end describe
