/* eslint-disable @typescript-eslint/no-non-null-assertion */

import {
    createTestSpaceWithZionMemberRole,
    registerAndStartClients,
    registerLoginAndStartClient,
} from 'use-zion-client/tests/integration/helpers/TestUtils'

import { MatrixEvent } from 'matrix-js-sdk'
import { Permission } from 'use-zion-client/src/client/web3/ContractTypes'
import { RoomIdentifier } from '../../src/types/room-identifier'
import { TestConstants } from './helpers/TestConstants'
import { waitFor } from '@testing-library/dom'
import { jest } from '@jest/globals'

describe('write messages', () => {
    test('Channel member cant write messages without permission', async () => {
        /** Arrange */

        // create all the users for the test
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        await bob.fundWallet()

        // create a space with token entitlement to write
        const roomId = await createTestSpaceWithZionMemberRole(
            bob,
            [Permission.Read, Permission.Write],
            [Permission.Read],
        )

        /** Act */

        // invite user to join the space by first checking if they can read.
        await bob.inviteUser(roomId as RoomIdentifier, alice.matrixUserId as string)
        await alice.joinRoom(roomId as RoomIdentifier)

        // bob sends a message to the room
        await bob.sendMessage(roomId as RoomIdentifier, 'Hello tokenGrantedUser!')

        // user sends a message to the room
        const consoleErrorSpy = jest.spyOn(global.console, 'error')

        /** Assert */
        try {
            await alice.sendMessage(roomId as RoomIdentifier, 'Hello Bob!')
        } catch (e) {
            expect((e as Error).message).toContain('Unauthorised')
        }
        expect(consoleErrorSpy).toHaveBeenCalled()

        await waitFor(
            () =>
                expect(
                    alice
                        .getRoom(roomId as RoomIdentifier)
                        ?.getLiveTimeline()
                        .getEvents()
                        .find(
                            (event: MatrixEvent) =>
                                event.getContent()?.body === 'Hello tokenGrantedUser!',
                        ),
                ).toBeDefined(),
            TestConstants.DefaultWaitForTimeout,
        )

        // bob should not receive the message
        await waitFor(
            () =>
                expect(
                    bob
                        .getRoom(roomId as RoomIdentifier)
                        ?.getLiveTimeline()
                        .getEvents()
                        .find((event: MatrixEvent) => event.getContent()?.body === 'Hello Bob!'),
                ).toBeUndefined(),
            TestConstants.DefaultWaitForTimeout,
        )
    })

    test('Channel member can sync messages', async () => {
        /** Arrange */

        // create all the users for the test
        const tokenGrantedUser = await registerLoginAndStartClient(
            'tokenGrantedUser',
            TestConstants.getWalletWithNft(),
        )
        const { bob } = await registerAndStartClients(['bob'])
        await bob.fundWallet()

        // create a space with token entitlement to write
        const roomId = await createTestSpaceWithZionMemberRole(bob, [
            Permission.Read,
            Permission.Write,
        ])

        /** Act */

        // invite user to join the space by first checking if they can read.
        await bob.inviteUser(roomId as RoomIdentifier, tokenGrantedUser.matrixUserId as string)
        await tokenGrantedUser.joinRoom(roomId as RoomIdentifier)
        // bob send 25 messages (20 is our default initialSyncLimit)
        for (let i = 0; i < 25; i++) {
            await bob.sendMessage(roomId as RoomIdentifier, `message ${i}`)
        }

        /** Assert */

        // user should expect an invite to the room
        await waitFor(
            () => expect(tokenGrantedUser.getRoom(roomId as RoomIdentifier)).toBeDefined(),
            TestConstants.DefaultWaitForTimeout,
        )

        // call scrollback
        await tokenGrantedUser.scrollback(roomId as RoomIdentifier, 30)

        // we should get more events
        await waitFor(
            () =>
                expect(
                    tokenGrantedUser
                        .getRoom(roomId as RoomIdentifier)
                        ?.getLiveTimeline()
                        .getEvents().length,
                ).toBeGreaterThan(20),
            TestConstants.DefaultWaitForTimeout,
        )
    })

    test('Channel member can write messages', async () => {
        /** Arrange */

        // create all the users for the test
        const tokenGrantedUser = await registerLoginAndStartClient(
            'tokenGrantedUser',
            TestConstants.getWalletWithNft(),
        )
        const { bob } = await registerAndStartClients(['bob'])
        await bob.fundWallet()

        // create a space with token entitlement to write
        const roomId = await createTestSpaceWithZionMemberRole(bob, [
            Permission.Read,
            Permission.Write,
        ])

        /** Act */
        // invite user to join the space by first checking if they can read.
        await bob.inviteUser(roomId as RoomIdentifier, tokenGrantedUser.matrixUserId as string)
        await tokenGrantedUser.joinRoom(roomId as RoomIdentifier)

        // bob sends a message to the room
        await bob.sendMessage(roomId as RoomIdentifier, 'Hello tokenGrantedUser!')

        // user sends a message to the room
        await tokenGrantedUser.sendMessage(roomId as RoomIdentifier, 'Hello Bob!')

        await bob.scrollback(roomId as RoomIdentifier, 30)
        await tokenGrantedUser.scrollback(roomId as RoomIdentifier, 30)

        /** Assert */

        await waitFor(
            () =>
                expect(
                    bob
                        .getRoom(roomId as RoomIdentifier)
                        ?.getLiveTimeline()
                        .getEvents()
                        .find((event: MatrixEvent) => event.getContent()?.body === 'Hello Bob!'),
                ).toBeDefined(),
            TestConstants.DefaultWaitForTimeout,
        )
    })
})
