/**
 * sendReaction.test.ts
 *
 * // https://www.npmjs.com/package/jest-runner-groups
 * @group core
 *
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { waitFor } from '@testing-library/dom'

import {
    createTestChannelWithSpaceRoles,
    createTestSpaceGatedByTownNft,
    registerAndStartClients,
    waitForWithRetries,
} from './helpers/TestUtils'

import { Permission } from '@river-build/web3'
import { RiverTimelineEvent, ReactionEvent, ChannelMessageEvent } from '@river-build/sdk'

describe('sendReaction', () => {
    // test:
    test('create room, send message, send a reaction', async () => {
        // create clients
        const { bob, alice } = await registerAndStartClients(['bob', 'alice'])
        // bob needs funds to create a space
        await bob.fundWallet()
        // create a space
        const spaceId = await createTestSpaceGatedByTownNft(
            bob,
            [Permission.Read, Permission.Write],
            {
                name: bob.makeUniqueName(),
            },
        )
        // create a channel
        const channelId = await createTestChannelWithSpaceRoles(bob, {
            name: 'bobs channel',
            parentSpaceId: spaceId,
            roles: [{ roleId: 2, permissions: [] }],
        })

        console.log("bob's spaceId", { spaceId, channelId })

        await alice.joinTown(spaceId, alice.wallet)
        await waitForWithRetries(() => alice.joinRoom(channelId))

        // bob sends a message to the room
        await bob.sendMessage(channelId, 'Hello, world from Bob!')

        // wait for alice to receive the message
        await waitFor(async () => {
            const event = await alice.getLatestEvent<ChannelMessageEvent>(channelId)
            expect(event?.content?.body).toEqual('Hello, world from Bob!')
        })

        // alice grabs the message
        const event = await alice.getLatestEvent(channelId)

        expect(event).toBeTruthy()

        // alice sends a reaction
        await alice.sendReaction(channelId, event!.eventId, '👍')

        // wait for bob to receive the reaction
        await waitFor(async () => {
            const e = await bob.getLatestEvent<ReactionEvent>(
                channelId,
                RiverTimelineEvent.Reaction,
            )
            bob.logEvents(channelId)
            expect(e?.content?.kind).toEqual(RiverTimelineEvent.Reaction)
            expect(e?.content?.reaction).toEqual('👍')
        })
    }) // end test
}) // end describe
