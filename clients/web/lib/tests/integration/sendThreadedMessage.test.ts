/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group casablanca
 */
// group dendrite TODO: https://linear.app/hnt-labs/issue/HNT-1604/testsintegrationsendthreadedmessagetestts
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceWithEveryoneRole,
    registerAndStartClients,
    waitForWithRetries,
} from './helpers/TestUtils'

import { Permission } from '../../src/client/web3/ContractTypes'
import { RoomVisibility } from '../../src/types/zion-types'
import { waitFor } from '@testing-library/dom'
import { RoomMessageEvent } from '../../src/types/timeline-types'

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

        await waitForWithRetries(() => alice.joinRoom(channelId))

        // bob sends a message to the room
        await bob.sendMessage(channelId, 'Hello Alice!')
        // wait for alice to receive the message
        await waitFor(async () => {
            const e = await alice.getLatestEvent<RoomMessageEvent>(channelId)
            expect(e?.content?.body).toEqual('Hello Alice!')
        })
        // event
        const event = await alice.getLatestEvent(channelId)
        // assert assumptions
        expect(event?.threadParentId).toBeUndefined()
        // alice sends a threaded reply room
        await waitForWithRetries(() =>
            alice.sendMessage(channelId, 'Hello Bob!', { threadId: event?.eventId }),
        )
        // bob should receive the message & thread id should be set to parent event id
        await waitFor(async () => {
            const e = await bob.getLatestEvent<RoomMessageEvent>(channelId)
            expect(e?.content?.body).toEqual('Hello Bob!')
            expect(e?.content?.inReplyTo).toEqual(event?.eventId)
        })
        await alice.logout()
        await bob.logout()
    }, 240_000) // end test
}) // end describe
