/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { createTestSpaceWithEveryoneRole, registerAndStartClients } from './helpers/TestUtils'

import { Permission } from '../../src/client/web3/ZionContractTypes'
import { RoomIdentifier } from '../../src/types/room-identifier'
import { RoomVisibility } from '../../src/types/matrix-types'
import { TestConstants } from './helpers/TestConstants'
import { waitFor } from '@testing-library/dom'

describe('editMessage', () => {
    // test: sendAMessage
    test('create room, invite user, send message, edit message', async () => {
        // create clients
        // alice needs to have a valid nft in order to join bob's space / channel
        const { bob, alice } = await registerAndStartClients(['bob', 'alice'])
        // bob needs funds to create a space
        await bob.fundWallet()
        // bob creates a room
        const roomId = (await createTestSpaceWithEveryoneRole(
            bob,
            [Permission.Read, Permission.Write],
            {
                name: bob.makeUniqueName(),
                visibility: RoomVisibility.Private,
            },
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
        // wait for bob to see the member event
        await waitFor(() => {
            const displayName = bob
                .getRoom(roomId)
                ?.getLiveTimeline()
                .getEvents()
                .at(-1)
                ?.getContent().displayname as string
            const aliceId = alice.matrixUserId!.toLowerCase().replace('@', '').split(':')[0]
            return expect(displayName).toBe(aliceId)
        }, TestConstants.DefaultWaitForTimeout)
        // bob sends a message to the room
        await bob.sendMessage(roomId, 'Hello Balice!')
        // alice should receive the message
        await waitFor(
            () =>
                expect(
                    alice.getRoom(roomId)?.getLiveTimeline().getEvents().at(-1)?.getContent()
                        .body as string,
                ).toEqual('Hello Balice!'),
            TestConstants.DefaultWaitForTimeout,
        )
        // bob wants to edit the message!
        const event = bob
            .getRoom(roomId)!
            .getLiveTimeline()
            .getEvents()
            .filter((x) => x.getType() === 'm.room.message')
            .at(-1)!
        // assert assumptions
        expect(event?.getContent().body).toBe('Hello Balice!')
        // edit the message
        await bob.editMessage(
            roomId,
            'Hello Alice!',
            {
                originalEventId: event.getId(),
            },
            undefined,
        )
        // bob should show the new message
        await waitFor(
            () =>
                expect(
                    bob
                        .getRoom(roomId)
                        ?.getLiveTimeline()
                        .getEvents()
                        .filter((x) => x.getType() === 'm.room.message')
                        .at(-1)
                        ?.getContent().body as string,
                ).toBe('Hello Alice!'),
            TestConstants.DefaultWaitForTimeout,
        )
        // alice should see the new message
        await waitFor(
            () =>
                expect(
                    alice
                        .getRoom(roomId)
                        ?.getLiveTimeline()
                        .getEvents()
                        .filter((x) => x.getType() === 'm.room.message')
                        .at(-1)
                        ?.getContent().body as string,
                ).toBe('Hello Alice!'),
            TestConstants.DefaultWaitForTimeout,
        )
    }) // end test
}) // end describe
