/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group dendrite
 */
import { RoomIdentifier } from '../../src/types/room-identifier'
import {
    createTestSpaceGatedByTownAndZionNfts,
    registerAndStartClients,
    registerAndStartClient,
} from './helpers/TestUtils'

import { Permission } from '@river/web3'
import { TestConstants } from './helpers/TestConstants'
import { act, waitFor } from '@testing-library/react'

describe('userProfile', () => {
    // usefull for debugging or running against cloud servers
    // test
    test('create users, update profile, create room, join, update profile', async () => {
        // create clients
        const { bob } = await registerAndStartClients(['bob'])
        // bob sets user name and profile photo
        await bob.setDisplayName("Bob's your uncle")
        await bob.setAvatarUrl('https://example.com/bob.png')
        // bob needs funds to create a space
        await bob.fundWallet()
        // bob creates a room
        const spaceId = (await createTestSpaceGatedByTownAndZionNfts(bob, [
            Permission.Read,
            Permission.Write,
        ])) as RoomIdentifier
        // alice needs to have a valid nft in order to join bob's space / channel
        const alice = await registerAndStartClient('alice', TestConstants.getWalletWithMemberNft())
        // alice joins the room
        await alice.joinTown(spaceId, alice.wallet)
        // alice should see bob's user name
        await waitFor(() =>
            expect(alice.getRoomMember(spaceId, bob.getUserId()!)?.name).toBe("Bob's your uncle"),
        )
        // alice should see bob's profile photo
        await waitFor(() =>
            expect(alice.getRoomMember(spaceId, bob.getUserId()!)?.avatarUrl).toBe(
                'https://example.com/bob.png',
            ),
        )
        // log alice's view of bob
        const alicesViewOfBob = alice.getRoomMember(spaceId, bob.getUserId()!)
        console.log('alice sees bob as', {
            name: alicesViewOfBob?.name,
            disambiguate: alicesViewOfBob?.disambiguate,
            rawDisplayName: alicesViewOfBob?.rawDisplayName,
            avatarUrl: alicesViewOfBob?.avatarUrl,
        })
        // log bob's view of alice
        const bobsViewOfAlice = bob.getRoomMember(spaceId, alice.getUserId()!)
        console.log('bob sees alice as', {
            name: bobsViewOfAlice?.name,
            disambiguate: bobsViewOfAlice?.disambiguate,
            rawDisplayName: bobsViewOfAlice?.rawDisplayName,
            avatarUrl: bobsViewOfAlice?.avatarUrl,
        })
        // alice updates her profile
        await act(async () => {
            await alice.setDisplayName("Alice's your aunt")
            await alice.setAvatarUrl('https://example.com/alice.png')
        })
        // bob should see alices new user name
        await waitFor(() =>
            expect(bob.getRoomMember(spaceId, alice.getUserId()!)?.name).toBe("Alice's your aunt"),
        )
        // alice should see bob's profile photo
        await waitFor(() =>
            expect(bob.getRoomMember(spaceId, alice.getUserId()!)?.avatarUrl).toBe(
                'https://example.com/alice.png',
            ),
        )
        // send a message
        await act(async () => {
            await bob.sendMessage(spaceId, 'hello')
        })
        // alice should see the message
        await waitFor(
            () => expect(alice.getMessages(spaceId)).toContain('hello'),
            TestConstants.DecaDefaultWaitForTimeout,
        )
        // get the message
        const message = alice
            .getEvents_TypedRoomMessage(spaceId)
            .find((event) => event.content.body === 'hello')
        // sender?
        expect(message?.sender?.displayName).toBe("Bob's your uncle")
    }) // end test
}) // end describe
