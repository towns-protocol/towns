/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { waitFor } from '@testing-library/dom'

import {
    createTestChannelWithSpaceRoles,
    createTestSpaceWithEveryoneRole,
    getTestPrimaryProtocol,
    registerAndStartClients,
} from './helpers/TestUtils'

import { Permission } from '../../src/client/web3/ContractTypes'
import { ZTEvent } from '../../src/types/timeline-types'
import { RoomVisibility } from '../../src/types/matrix-types'

describe('sendReaction', () => {
    // test:
    test('create room, send message, send a reaction', async () => {
        // create clients
        const { bob, alice } = await registerAndStartClients(['bob', 'alice'])
        // bob needs funds to create a space
        await bob.fundWallet()
        // create a space
        const spaceId = (await createTestSpaceWithEveryoneRole(
            bob,
            [Permission.Read, Permission.Write],
            {
                name: bob.makeUniqueName(),
                visibility: RoomVisibility.Public,
                spaceProtocol: getTestPrimaryProtocol(),
            },
        ))!
        // create a channel
        const channelId = (await createTestChannelWithSpaceRoles(bob, {
            name: 'bobs channel',
            parentSpaceId: spaceId,
            visibility: RoomVisibility.Public,
            roleIds: [],
        }))!

        console.log("bob's spaceId", { spaceId, channelId })

        await alice.joinRoom(channelId)

        // bob sends a message to the room
        await bob.sendMessage(channelId, 'Hello, world from Bob!')

        // wait for alice to receive the message
        await waitFor(async () => {
            // TODO - matrixUserId should be fixed as CB users wont have it
            const event = await alice.getLatestEvent(channelId, alice.matrixUserId!)
            expect(
                event?.content?.kind === ZTEvent.RoomMessage &&
                    event?.content?.body === 'Hello, world from Bob!',
            ).toEqual(true)
        })

        // alice grabs the message
        const event = await alice.getLatestEvent(channelId, alice.matrixUserId!)

        // alice sends a reaction
        event && (await alice.sendReaction(channelId, event.eventId, '👍'))

        // wait for bob to receive the reaction
        await waitFor(async () => {
            const e = await bob.getLatestEvent(channelId, bob.matrixUserId!, ZTEvent.Reaction)
            expect(e?.content?.kind === ZTEvent.Reaction && e?.content?.reaction === '👍').toEqual(
                true,
            )
        })
    }) // end test
}) // end describe
