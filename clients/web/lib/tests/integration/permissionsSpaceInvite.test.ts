/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { MAXTRIX_ERROR, MatrixError, NoThrownError, getError } from './helpers/ErrorUtils'
import {
    createTestSpaceWithZionMemberRole,
    registerAndStartClients,
    registerLoginAndStartClient,
} from 'use-zion-client/tests/integration/helpers/TestUtils'

import { Permission } from 'use-zion-client/src/client/web3/ZionContractTypes'
import { Room } from 'use-zion-client/src/types/matrix-types'
import { TestConstants } from './helpers/TestConstants'

describe('space invite', () => {
    jest.setTimeout(TestConstants.DefaultJestTimeout)

    test('Inviter is not allowed due to missing Invite permission', async () => {
        /** Arrange */

        // create all the users for the test
        const { alice, bob, einstein } = await registerAndStartClients(['alice', 'bob', 'einstein'])
        await bob.fundWallet()

        // create a space with token entitlement
        const roomId = await createTestSpaceWithZionMemberRole(bob, [Permission.Read])

        /** Act */
        // invite users to join the space.
        try {
            if (roomId && einstein.matrixUserId) {
                // TODO: add an assertion on inviteUser by typing return value
                await alice.inviteUser(roomId, einstein.matrixUserId)
            }
        } catch (e) {
            /** Assert */
            expect((e as Error).message).toContain('Inviter not allowed')
            return
        }
        expect(true).toEqual(false)
    }) // end test

    test('Invitee is not allowed to write to token gated space without token', async () => {
        /** Arrange */

        // create all the users for the test
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        await bob.fundWallet()

        // create a space with token entitlement to write
        const roomId = await createTestSpaceWithZionMemberRole(bob, [
            Permission.Read,
            Permission.Write,
        ])

        const isEntitledRead = await alice.isEntitled(
            roomId?.matrixRoomId as string,
            '',
            alice.provider.wallet.address,
            { name: Permission.Read },
        )
        const isEntitledWrite = await alice.isEntitled(
            roomId?.matrixRoomId as string,
            '',
            alice.provider.wallet.address,
            { name: Permission.Write },
        )
        /** Act */
        // invite user to join the space by first checking if they can read.
        if (roomId && alice.matrixUserId) {
            !isEntitledRead && (await bob.inviteUser(roomId, alice.matrixUserId))
        }
        /** Assert */
        expect(isEntitledRead).toBe(false)
        // alice can't write because she doesn't have token entitlement
        expect(isEntitledWrite).toBe(false)
    }) // end test

    test('Invitee is allowed to write to token gated space with token', async () => {
        /** Arrange */

        // create all the users for the test
        const tokenGrantedUser = await registerLoginAndStartClient(
            'tokenGrantedUser',
            TestConstants.getWalletWithNft(),
        )
        const { bob } = await registerAndStartClients(['bob'])
        await bob.fundWallet()

        // create a space with token entitlement to write
        // TODO: allow for adjusted default Everyone permission, to remove
        // default Read which invariably allows all invitees regardless of
        // token gating

        const roomId = await createTestSpaceWithZionMemberRole(bob, [
            Permission.Read,
            Permission.Write,
        ])
        const isEntitledRead = await tokenGrantedUser.isEntitled(
            roomId?.matrixRoomId as string,
            '',
            tokenGrantedUser.provider.wallet.address,
            { name: Permission.Read },
        )
        const isEntitledWrite = await tokenGrantedUser.isEntitled(
            roomId?.matrixRoomId as string,
            '',
            tokenGrantedUser.provider.wallet.address,
            { name: Permission.Write },
        )
        /** Act */
        // invite user to join the space by first checking if they can read.
        if (roomId && tokenGrantedUser.matrixUserId) {
            isEntitledRead && (await bob.inviteUser(roomId, tokenGrantedUser.matrixUserId))
        }
        /** Assert */
        expect(isEntitledRead).toBe(true)
        // alice can write because she has token entitlement
        expect(isEntitledWrite).toBe(true)
    }) // end test

    test('Read permission is granted', async () => {
        /** Arrange */

        // create all the users for the test
        const tokenGrantedUser = await registerLoginAndStartClient(
            'tokenGrantedUser',
            TestConstants.getWalletWithNft(),
        )
        const { bob } = await registerAndStartClients(['bob'])
        await bob.fundWallet()

        // create a space with token entitlement
        const roomId = await createTestSpaceWithZionMemberRole(bob, [Permission.Read])

        // invite users to join the space.
        if (roomId) {
            tokenGrantedUser.matrixUserId &&
                (await bob.inviteUser(roomId, tokenGrantedUser.matrixUserId))
        }
        /** Act */
        let actualJoin: Room | undefined
        if (roomId) {
            actualJoin = await tokenGrantedUser.joinRoom(roomId)
        }

        /** Assert */
        // can join the room if the user has Read permission.
        expect(actualJoin).toBeDefined()
    }) // end test

    test('Read permission is denied', async () => {
        /** Arrange */

        // create all the users for the test
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        await bob.fundWallet()

        // create a space with token entitlement
        const roomId = await createTestSpaceWithZionMemberRole(bob, [Permission.Read])

        // invite users to join the space.
        if (roomId) {
            alice.matrixUserId && (await bob.inviteUser(roomId, alice.matrixUserId))
        }

        /** Act */
        const error = await getError<MatrixError>(async function () {
            if (roomId) {
                await alice.joinRoom(roomId)
            }
        })

        /** Assert */
        // check that the returned error wasn't that no error was thrown.
        expect(error).not.toBeInstanceOf(NoThrownError)
        // Forbidden exception because the user does not have Read permission
        expect(error.data).toHaveProperty('errcode', MAXTRIX_ERROR.M_FORBIDDEN)
    }) // end test
}) // end describe
