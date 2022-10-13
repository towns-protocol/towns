/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { waitFor } from '@testing-library/dom'
import { RoomVisibility } from '../../src/types/matrix-types'
import { registerAndStartClients } from './helpers/TestUtils'

describe('editMessage', () => {
    // usefull for debugging or running against cloud servers
    jest.setTimeout(30 * 1000)
    // test: sendAMessage
    test('create room, invite user, send message, edit message', async () => {
        // create clients
        const { bob, alice } = await registerAndStartClients(['bob', 'alice'])
        // bob creates a room
        const roomId = await bob.createSpace({
            name: "bob's room",
            visibility: RoomVisibility.Private,
        })
        // bob invites alice to the room
        await bob.inviteUser(roomId, alice.matrixUserId!)
        // alice should expect an invite to the room
        await waitFor(() => expect(alice.getRoom(roomId)).toBeDefined())
        // alice joins the room
        await alice.joinRoom(roomId)
        // wait for bob to see the member event
        await waitFor(
            () =>
                expect(
                    bob.getRoom(roomId)?.getLiveTimeline().getEvents().at(-1)?.getContent()
                        .displayname as string,
                ).toBe(alice.matrixUserId!.toLowerCase().replace('@', '').split(':')[0]),
            { timeout: 3000 },
        )
        // bob sends a message to the room
        await bob.sendMessage(roomId, 'Hello Balice!')
        // alice should receive the message
        await waitFor(() =>
            expect(
                alice.getRoom(roomId)?.getLiveTimeline().getEvents().at(-1)?.getContent()
                    .body as string,
            ).toEqual('Hello Balice!'),
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
        await bob.editMessage(roomId, 'Hello Alice!', {
            originalEventId: event.getId(),
        })
        // bob should show the new message
        await waitFor(() =>
            expect(
                bob
                    .getRoom(roomId)
                    ?.getLiveTimeline()
                    .getEvents()
                    .filter((x) => x.getType() === 'm.room.message')
                    .at(-1)
                    ?.getContent().body as string,
            ).toBe('Hello Alice!'),
        )
        // alice should see the new message
        await waitFor(() =>
            expect(
                alice
                    .getRoom(roomId)
                    ?.getLiveTimeline()
                    .getEvents()
                    .filter((x) => x.getType() === 'm.room.message')
                    .at(-1)
                    ?.getContent().body as string,
            ).toBe('Hello Alice!'),
        )
    }) // end test
}) // end describe
