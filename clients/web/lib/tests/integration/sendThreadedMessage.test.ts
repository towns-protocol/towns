/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group core
 */
// group dendrite TODO: https://linear.app/hnt-labs/issue/HNT-1604/testsintegrationsendthreadedmessagetestts
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceGatedByTownNft,
    makeUniqueName,
    registerAndStartClients,
    waitForWithRetries,
} from './helpers/TestUtils'

import { Permission } from '@river-build/web3'
import { waitFor } from '@testing-library/dom'
import { ChannelMessageEvent } from '@river-build/sdk'

describe('sendThreadedMessage', () => {
    // usefull for debugging or running against cloud servers
    // test: sendAMessage
    test('create room, invite user, accept invite, and send threadded message', async () => {
        // create clients
        const { bob, alice } = await registerAndStartClients(['bob', 'alice'])
        // bob needs funds to create a space
        await bob.fundWallet()
        // create a space
        const spaceId = await createTestSpaceGatedByTownNft(
            bob,
            // For alice to create a channel, the role must include the AddRemoveChannels permission.
            [Permission.Read, Permission.Write, Permission.AddRemoveChannels],
            {
                name: makeUniqueName('bobs space'),
            },
        )
        // create a channel
        const channelId = (await createTestChannelWithSpaceRoles(bob, {
            name: 'bobs channel',
            parentSpaceId: spaceId,
            roles: [],
        }))!

        console.log("bob's spaceId", { spaceId, channelId })

        await alice.joinTown(spaceId, alice.wallet)
        await waitForWithRetries(() => alice.joinRoom(channelId))

        // bob sends a message to the room
        await bob.sendMessage(channelId, 'Hello Alice!')
        // wait for alice to receive the message
        await waitFor(async () => {
            const e = await alice.getLatestEvent<ChannelMessageEvent>(channelId)
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
            const e = await bob.getLatestEvent<ChannelMessageEvent>(channelId)
            expect(e?.content?.body).toEqual('Hello Bob!')
            expect(e?.content?.threadId).toEqual(event?.eventId)
        })
        await alice.logout()
        await bob.logout()
    }, 240_000) // end test
}) // end describe
