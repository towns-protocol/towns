/* eslint-disable @typescript-eslint/no-non-null-assertion */

import {
    createTestChannelWithSpaceRoles,
    createTestSpaceWithEveryoneRole,
    getTestPrimaryProtocol,
    registerAndStartClients,
} from './helpers/TestUtils'

import { Permission } from '../../src/client/web3/ContractTypes'
import { TestConstants } from './helpers/TestConstants'
import { ZTEvent } from '../../src/types/timeline-types'
import { waitFor } from '@testing-library/dom'
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

        // grab the event
        const event = alice.getRoom(channelId)?.getLiveTimeline().getEvents().at(-1)

        event && (await alice.sendReaction(channelId, event.getId(), '👍'))

        // bob should receive the reaction
        await waitFor(
            () =>
                expect(
                    bob.getRoom(channelId)?.getLiveTimeline().getEvents().at(-1)?.getType(),
                ).toBe(ZTEvent.Reaction),
            TestConstants.DefaultWaitForTimeout,
        )
    }) // end test
}) // end describe
