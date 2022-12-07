/* eslint-disable @typescript-eslint/no-non-null-assertion */

import {
    createTestSpaceWithZionMemberRole,
    registerAndStartClients,
    registerLoginAndStartClient,
} from './helpers/TestUtils'

import { Permission } from '../../src/client/web3/ZionContractTypes'
import { RoomIdentifier } from '../../src/types/matrix-types'
import { TestConstants } from './helpers/TestConstants'
import { ZTEvent } from '../../src/types/timeline-types'
import { waitFor } from '@testing-library/dom'

describe('sendReaction', () => {
    jest.setTimeout(TestConstants.DefaultJestTimeout)
    // test:
    test('create room, invite user, accept invite, send message, send a reaction', async () => {
        // create clients
        // alice needs to have a valid nft in order to join bob's space / channel
        const alice = await registerLoginAndStartClient('alice', TestConstants.getWalletWithNft())
        const { bob } = await registerAndStartClients(['bob'])
        // bob needs funds to create a space
        await bob.fundWallet()
        // bob creates a room
        const roomId = (await createTestSpaceWithZionMemberRole(
            bob,
            [Permission.Read, Permission.Write],
            [],
        )) as RoomIdentifier
        // bob invites alice to the room
        await bob.inviteUser(roomId, alice.matrixUserId!)
        // alice should expect an invite to the room
        await waitFor(
            () => expect(alice.getRoom(roomId)).toBeDefined(),
            TestConstants.DefaultWaitForTimeout,
        )
        // alice joins the room
        await alice.joinRoom(roomId)
        // bob sends a message to the room
        await bob.sendMessage(roomId, 'Hello Alice!')
        // alice should receive the message
        await waitFor(
            () =>
                expect(
                    alice.getRoom(roomId)?.getLiveTimeline().getEvents().at(-1)?.getContent().body,
                ).toBe('Hello Alice!'),
            TestConstants.DefaultWaitForTimeout,
        )
        // grab the event
        const event = alice.getRoom(roomId)?.getLiveTimeline().getEvents().at(-1)
        // alice sends a reaction to the message
        event && (await alice.sendReaction(roomId, event.getId(), '👍'))
        // bob should receive the message
        await waitFor(
            () =>
                expect(bob.getRoom(roomId)?.getLiveTimeline().getEvents().at(-1)?.getType()).toBe(
                    ZTEvent.Reaction,
                ),
            TestConstants.DefaultWaitForTimeout,
        )
    }) // end test
}) // end describe
