/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group casablanca
 * @group dendrite
 */
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceWithEveryoneRole,
    registerAndStartClients,
    waitForWithRetries,
} from './helpers/TestUtils'

import { RoomVisibility } from '../../src/types/zion-types'
import { waitFor } from '@testing-library/dom'
import { RoomMessageEvent } from '../../src/types/timeline-types'
import { Permission } from '@river/web3'

describe('editMessage', () => {
    // test: editMessage
    test('create room, invite user, send message, edit message', async () => {
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

        await waitForWithRetries(() => alice.joinRoom(channelId))

        // bob sends a message to the room
        await bob.sendMessage(channelId, 'Hello Balice!')

        // wait for alice to receive the message
        await waitFor(async () => {
            const e = await alice.getLatestEvent<RoomMessageEvent>(channelId)
            expect(e?.content?.body).toEqual('Hello Balice!')
        })

        // this is hack to ensure csb cache loads bob's message in bob's client
        await waitFor(async () => {
            const e = await bob.getLatestEvent<RoomMessageEvent>(channelId)
            expect(e?.content?.body).toEqual('Hello Balice!')
        })

        // bob get the last message
        const event = await bob.getLatestEvent<RoomMessageEvent>(channelId)
        if (!event) {
            throw new Error('event is undefined')
        }
        expect(event?.content?.body).toEqual('Hello Balice!')

        // bob sends edited message to the room
        await bob.editMessage(channelId, event.eventId, event.content, 'Hello Alice!', undefined)

        // bob should see the edited msg.
        await waitFor(async () => {
            const e = await bob.getLatestEvent<RoomMessageEvent>(channelId)
            expect(e?.content?.body).toEqual('Hello Alice!')
            expect(e?.content?.replacedMsgId).toEqual(event?.eventId)
        })

        // wait for alice to receive the edited message
        await waitFor(async () => {
            const e = await alice.getLatestEvent<RoomMessageEvent>(channelId)
            expect(e?.content?.body).toEqual('Hello Alice!')
            expect(e?.content?.replacedMsgId).toEqual(event?.eventId)
        })
    }) // end test
}) // end describe
