/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { waitFor } from '@testing-library/dom'
import { MatrixEvent } from 'matrix-js-sdk'
import { RoomVisibility } from '../../src/types/matrix-types'
import { registerAndStartClients } from './helpers/TestUtils'

describe('userProfile', () => {
    // usefull for debugging or running against cloud servers
    jest.setTimeout(30 * 1000)
    // test
    test('create users, update profile, create room, join, update profile', async () => {
        // create clients
        const { bob, alice } = await registerAndStartClients(['bob', 'alice'])
        // bob sets user name and profile photo
        await bob.setDisplayName("Bob's your uncle")
        await bob.setAvatarUrl('https://example.com/bob.png')
        // bob creates a room
        const roomId = await bob.createSpace({
            name: "bob's room",
            visibility: RoomVisibility.Public,
        })
        // alice joins the room
        await alice.joinRoom(roomId)
        // alice should see bob's user name
        await waitFor(() =>
            expect(alice.getRoom(roomId)?.getMember(bob.matrixUserId!)?.name).toBe(
                "Bob's your uncle",
            ),
        )
        // alice should see bob's profile photo
        await waitFor(() =>
            expect(alice.getRoom(roomId)?.getMember(bob.matrixUserId!)?.getMxcAvatarUrl()).toBe(
                'https://example.com/bob.png',
            ),
        )
        // log alice's view of bob
        const alicesViewOfBob = alice.getRoom(roomId)?.getMember(bob.matrixUserId!)
        console.log('alice sees bob as', {
            name: alicesViewOfBob?.name,
            disambiguate: alicesViewOfBob?.disambiguate,
            rawDisplayName: alicesViewOfBob?.rawDisplayName,
            avatarUrl: alicesViewOfBob?.getMxcAvatarUrl(),
        })
        // log bob's view of alice
        const bobsViewOfAlice = bob.getRoom(roomId)?.getMember(alice.matrixUserId!)
        console.log('bob sees alice as', {
            name: bobsViewOfAlice?.name,
            disambiguate: bobsViewOfAlice?.disambiguate,
            rawDisplayName: bobsViewOfAlice?.rawDisplayName,
            avatarUrl: bobsViewOfAlice?.getMxcAvatarUrl(),
        })
        // alice updates her profile
        await alice.setDisplayName("Alice's your aunt")
        await alice.setAvatarUrl('https://example.com/alice.png')
        // bob should see alices new user name
        await waitFor(() =>
            expect(bob.getRoom(roomId)?.getMember(alice.matrixUserId!)?.name).toBe(
                "Alice's your aunt",
            ),
        )
        // alice should see bob's profile photo
        await waitFor(() =>
            expect(bob.getRoom(roomId)?.getMember(alice.matrixUserId!)?.getMxcAvatarUrl()).toBe(
                'https://example.com/alice.png',
            ),
        )
        // send a message
        await bob.sendMessage(roomId, 'hello')
        // alice should see the message
        await waitFor(() =>
            expect(
                alice.getRoom(roomId)?.getLiveTimeline().getEvents().at(-1)?.getContent().body,
            ).toBe('hello'),
        )
        // get the message
        const message = alice
            .getRoom(roomId)
            ?.getLiveTimeline()
            .getEvents()
            .find((event: MatrixEvent) => event.getContent()?.body === 'hello')
        // sender?
        expect(message?.sender?.rawDisplayName).toBe("Bob's your uncle")
    }) // end test
}) // end describe
