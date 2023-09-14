/**
 * sendAMessage
 *
 * // https://www.npmjs.com/package/jest-runner-groups
 * @group integration/load2
 *
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceWithEveryoneRole,
    registerAndStartClients,
    waitForWithRetries,
} from '../integration/helpers/TestUtils'

import { Permission } from '@river/web3'
import { RoomVisibility } from '../../src/types/zion-types'
import { RoomIdentifier } from '../../src/types/room-identifier'

import { waitFor } from '@testing-library/react'
import { TestConstants } from '../integration/helpers/TestConstants'
//Basic version of load test.
//Scenario:
//1. User 1 creates a space and a channel
//2. User 2-10 joins the space and channel
//3. Uers 1-10 sends numberOfMessages messages each to the channel
//4. User 11 joins the channel and we check that it receives last sent message from at least one of first 10 users and that it happens within 600 miliseconds.
//   *Join channel - means user receives the latest message of at least on of the users from the channel

describe('loadtest1', () => {
    //Test is skipped until not fully implemented
    test('create room, invite user, accept invite, and send encrypted message', async () => {
        const numClients = process.env.NUM_CLIENTS ? parseInt(process.env.NUM_CLIENTS, 10) : 2
        const numberOfMessages = 100 //Total number of messages to send per user

        // create clients
        const names = Array.from(Array(numClients).keys()).map((i) => `client_${i}`)
        const clients = await registerAndStartClients(names)

        //Bob is a user which will create space and channel
        const bob = clients['client_0']
        //Alice is a user who will join the created channel and retrieve messages from there
        const alice = clients[`client_${numClients - 1}`]

        // bob creates a space
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

        // All users except the last one join the space
        const promises: never[] = []

        for (let i = 1; i < numClients - 1; i++) {
            const client = clients[`client_${i}`]
            promises.push(client.joinRoom(spaceId) as never)
        }

        await Promise.all(promises)

        // All users except the last one join the channel
        promises.splice(0)

        for (let i = 1; i < numClients - 1; i++) {
            const client = clients[`client_${i}`]
            promises.push(waitForWithRetries(() => client.joinRoom(channelId)) as never)
        }

        await Promise.all(promises)

        // Each of numClients-1 users sends numberOfMessages message to the channel to prepare test data
        for (let i = 0; i < numClients - 1; i++) {
            const client = clients[`client_${i}`]
            for (let j = 0; j < numberOfMessages; j++) {
                await client.sendMessage(channelId, `Message m${j} from ${i} with number `)
            }
        }

        //Alice joins the space
        await alice.joinRoom(spaceId)
        //Alice joins the channel
        await waitForWithRetries(() => alice.joinRoom(channelId))

        const startTime = Date.now()

        await waitFor(() => {
            expect(alice.getEventsDescription(channelId)).toContain(
                'm' + String(numberOfMessages - 1),
            )
        }, TestConstants.DoubleDefaultWaitForTimeout)

        const endTime = Date.now()
        console.log(endTime - startTime)
        expect(endTime - startTime).toBeLessThan(600)
    }, 5000000) // end test
}) // end describe
