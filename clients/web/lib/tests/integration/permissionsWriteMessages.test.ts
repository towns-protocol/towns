/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group dendrite
 * @group casablanca
 */
import {
    createTestSpaceWithZionMemberRole,
    registerAndStartClients,
    registerAndStartClient,
    createTestChannelWithSpaceRoles,
    waitForWithRetries,
} from 'use-zion-client/tests/integration/helpers/TestUtils'

import { Permission } from 'use-zion-client/src/client/web3/ContractTypes'
import { TestConstants } from './helpers/TestConstants'
import { waitFor } from '@testing-library/dom'
import { RoomVisibility } from '../../src/types/zion-types'

describe('write messages', () => {
    test('Channel member cant write messages without permission', async () => {
        /** Arrange */

        // create all the users for the test
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        await bob.fundWallet()

        // create a space with token entitlement to write
        const spaceId = await createTestSpaceWithZionMemberRole(
            bob,
            [Permission.Read, Permission.Write],
            [Permission.Read],
        )

        if (!spaceId) {
            throw new Error('Failed to create room')
        }

        const roomId = await createTestChannelWithSpaceRoles(bob, {
            name: 'main channel',
            parentSpaceId: spaceId,
            visibility: RoomVisibility.Public,
            roleIds: [],
        })

        if (!roomId) {
            throw new Error('Failed to create room')
        }

        // /** Act */

        // // invite user to join the space by first checking if they can read.
        await bob.inviteUser(roomId, alice.getUserId() as string)

        await waitForWithRetries(() => alice.joinRoom(roomId))
        // bob sends a message to the room
        await bob.sendMessage(roomId, 'Hello tokenGrantedUser!')

        // TODO check why on Casablanca the error does not show in the console
        // const consoleErrorSpy = jest.spyOn(global.console, 'error')
        /** Assert */
        // user sends a message to the room
        try {
            await alice.sendMessage(roomId, 'Hello Bob!')
        } catch (e) {
            expect((e as Error).message).toMatch(new RegExp('Unauthorised|PermissionDenied'))
        }
        //expect(consoleErrorSpy).toHaveBeenCalled()
        await waitFor(
            () => expect(alice.getMessages(roomId)).toContain('Hello tokenGrantedUser!'),
            TestConstants.DoubleDefaultWaitForTimeout,
        )

        // bob should not receive the message
        expect(bob.getMessages(roomId)).not.toContain('Hello Bob!')
    })

    test('Channel member can sync messages', async () => {
        /** Arrange */

        // create all the users for the test
        const tokenGrantedUser = await registerAndStartClient(
            'tokenGrantedUser',
            TestConstants.getWalletWithMemberNft(),
        )
        const { bob } = await registerAndStartClients(['bob'])
        await bob.fundWallet()

        // create a space with token entitlement to write
        const spaceId = await createTestSpaceWithZionMemberRole(bob, [
            Permission.Read,
            Permission.Write,
        ])

        if (!spaceId) {
            throw new Error('Failed to create room')
        }

        const roomId = await createTestChannelWithSpaceRoles(bob, {
            name: 'main channel',
            parentSpaceId: spaceId,
            visibility: RoomVisibility.Public,
            roleIds: [],
        })

        if (!roomId) {
            throw new Error('Failed to create room')
        }

        /** Act */

        // invite user to join the space by first checking if they can read.
        await bob.inviteUser(spaceId, tokenGrantedUser.getUserId() as string)
        await waitForWithRetries(() => tokenGrantedUser.joinRoom(roomId))
        // bob send 25 messages (20 is our default initialSyncLimit)
        for (let i = 0; i < 25; i++) {
            await bob.sendMessage(roomId, `message ${i}`)
        }

        /** Assert */

        // user should expect an invite to the room
        await waitFor(() => expect(tokenGrantedUser.getRoomData(roomId)).toBeDefined())

        // we should get more events
        await waitFor(() => expect(tokenGrantedUser.getEvents(roomId).length).toBeGreaterThan(20))
    })

    test('Channel member can write messages', async () => {
        /** Arrange */

        // create all the users for the test
        const tokenGrantedUser = await registerAndStartClient(
            'tokenGrantedUser',
            TestConstants.getWalletWithMemberNft(),
        )
        const { bob } = await registerAndStartClients(['bob'])
        await bob.fundWallet()

        // create a space with token entitlement to write
        const spaceId = await createTestSpaceWithZionMemberRole(bob, [
            Permission.Read,
            Permission.Write,
        ])

        if (!spaceId) {
            throw new Error('Failed to create room')
        }

        const roomId = await createTestChannelWithSpaceRoles(bob, {
            name: 'main channel',
            parentSpaceId: spaceId,
            visibility: RoomVisibility.Public,
            roleIds: [],
        })

        if (!roomId) {
            throw new Error('Failed to create room')
        }

        /** Act */
        // invite user to join the space by first checking if they can read.
        await bob.inviteUser(roomId, tokenGrantedUser.getUserId() as string)
        await waitForWithRetries(() => tokenGrantedUser.joinRoom(roomId))

        // bob sends a message to the room
        await bob.sendMessage(roomId, 'Hello tokenGrantedUser!')

        // user sends a message to the room
        await waitForWithRetries(() => tokenGrantedUser.sendMessage(roomId, 'Hello Bob!'))

        /** Assert */

        await waitFor(() => expect(bob.getMessages(roomId)).toContain('Hello Bob!'))
    })
})
