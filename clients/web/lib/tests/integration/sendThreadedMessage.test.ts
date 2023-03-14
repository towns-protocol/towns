/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group casablanca
 */
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceWithEveryoneRole,
    registerAndStartClients,
} from './helpers/TestUtils'

import { Permission } from '../../src/client/web3/ContractTypes'
import { RoomVisibility } from '../../src/types/zion-types'
import { waitFor } from '@testing-library/dom'
import { ZTEvent } from '../../src/types/timeline-types'

describe('sendThreadedMessage', () => {
    // usefull for debugging or running against cloud servers
    // test: sendAMessage
    test('create room, invite user, accept invite, and send threadded message', async () => {
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
        await bob.sendMessage(channelId, 'Hello Alice!')
        // wait for alice to receive the message
        await waitFor(async () => {
            // TODO - matrixUserId should be fixed as CB users wont have it
            const e = await alice.getLatestEvent(channelId)
            expect(
                e?.content?.kind === ZTEvent.RoomMessage && e?.content?.body === 'Hello Alice!',
            ).toEqual(true)
        })
        // event
        const event = await alice.getLatestEvent(channelId)
        // assert assumptions
        expect(event?.threadParentId).toBeUndefined()
        // alice sends a threaded reply room
        await alice.sendMessage(channelId, 'Hello Bob!', { threadId: event?.eventId })
        // bob should receive the message & thread id should be set to parent event id
        await waitFor(async () => {
            // TODO - matrixUserId should be fixed as CB users wont have it
            const e = await bob.getLatestEvent(channelId)
            expect(
                e?.content?.kind === ZTEvent.RoomMessage &&
                    e?.content?.body === 'Hello Bob!' &&
                    e?.content?.inReplyTo === event?.eventId,
            ).toEqual(true)
        })
    }) // end test
}) // end describe
