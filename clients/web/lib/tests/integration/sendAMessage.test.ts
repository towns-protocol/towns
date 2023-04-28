/**
 * sendAMessage
 *
 * // https://www.npmjs.com/package/jest-runner-groups
 * @group integration/load
 * @group casablanca
 *
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceWithEveryoneRole,
    registerAndStartClients,
} from './helpers/TestUtils'

import { Permission } from '../../src/client/web3/ContractTypes'
import { RoomVisibility } from '../../src/types/zion-types'
import { RoomIdentifier } from '../../src/types/room-identifier'
import { waitFor } from '@testing-library/dom'
import { RoomMessageEvent } from '../../src/types/timeline-types'

describe('sendAMessage', () => {
    // test:
    test('create room, invite user, accept invite, and send message', async () => {
        const numClients = process.env.NUM_CLIENTS ? parseInt(process.env.NUM_CLIENTS, 10) : 2
        expect(numClients).toBeGreaterThanOrEqual(2)
        console.log('sendAMessage', { numClients })
        // create clients
        const names = Array.from(Array(numClients).keys()).map((i) => `client_${i}`)
        const clients = await registerAndStartClients(names)
        const bob = clients['client_0']

        // bob creates a space
        console.log(`!!!!!! bob creates space`)
        // bob needs funds to create a space
        await bob.fundWallet()
        // create a space
        const spaceId = (await createTestSpaceWithEveryoneRole(
            bob,
            [Permission.Read, Permission.Write],
            {
                name: bob.makeUniqueName(),
                visibility: RoomVisibility.Public,
            },
        ))!
        // create a channel
        const channelId = (await createTestChannelWithSpaceRoles(bob, {
            name: 'bobs channel',
            parentSpaceId: spaceId,
            visibility: RoomVisibility.Public,
            roleIds: [],
        })) as RoomIdentifier

        console.log("bob's spaceId", { spaceId, channelId })

        // everyone joins the space
        for (let i = 1; i < numClients; i++) {
            console.log(`!!!!!! client ${i} joins room`)
            const client = clients[`client_${i}`]
            await client.joinRoom(spaceId)
        }
        // everyone joins the room
        for (let i = 1; i < numClients; i++) {
            console.log(`!!!!!! client ${i} joins room`)
            const client = clients[`client_${i}`]
            await client.joinRoom(channelId)
        }

        // bob sends a message to the room
        console.log(`!!!!!! bob sends message`)
        await bob.sendMessage(channelId, 'Hello Alice!')

        // everyone should receive the message
        for (let i = 0; i < numClients; i++) {
            console.log(`!!!!!! client ${i} waits for message`)
            const client = clients[`client_${i}`]
            await waitFor(async () => {
                const event = await client.getLatestEvent<RoomMessageEvent>(channelId)
                expect(event?.content?.body).toEqual('Hello Alice!')
            })
        }
        // everyone sends a message to the room
        for (let i = 1; i < numClients; i++) {
            console.log(`!!!!!! client ${i} sends a message`)
            const client = clients[`client_${i}`]
            await client.sendMessage(channelId, `Hello Bob! from ${client.matrixUserId!}`)
            // bob should receive the message
            await waitFor(async () => {
                const event = await bob.getLatestEvent<RoomMessageEvent>(channelId)
                expect(event?.content?.body).toEqual(`Hello Bob! from ${client.matrixUserId!}`)
            })
        }
    }) // end test
}) // end describe
