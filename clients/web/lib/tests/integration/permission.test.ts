/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { MAXTRIX_ERROR, NoThrownError, getError, MatrixError } from './helpers/ErrorUtils'
import {
    createSpace,
    registerAndStartClients,
    registerLoginAndStartClient,
} from 'use-zion-client/tests/integration/helpers/TestUtils'

import { Permission } from 'use-zion-client/src/client/web3/ZionContractTypes'
import { Room } from 'use-zion-client/src/types/matrix-types'
import { TestConstants } from './helpers/TestConstants'
import { DataTypes } from '../../src/client/web3/shims/ZionSpaceManagerShim'

/** 
 * Todo: permission feature development, skip this suite in our CI.
 * Enable this suite when these tickets are fixed:
 * a) https://linear.app/hnt-labs/issue/HNT-212/fix-all-integration-tests-that-fail-when-authorization-check-is
 * b) https://linear.app/hnt-labs/issue/HNT-213/figure-out-local-deployment-for-enabling-authorization-checks
 * c) https://linear.app/hnt-labs/issue/HNT-152/docker-compose-to-build-local-node-and-run-contract-dependent-tests
 *  
 * Steps will be simplified and scripted soon.
 * 
 * To run the test, uncomment //describe.only
 * 
 * On dendrite server, change the dendrite.yaml:
 *    public_key_authentication:
        ethereum:
            ...
            chain_id: 31337
            networkUrl: "http://127.0.0.1:8545"
            enable_authz: true
 * 
 * */

describe.skip('permissions', () => {
    //describe.only('permissions', () => {
    jest.setTimeout(30 * 1000)

    test('Inviter is not allowed due to missing Invite permission', async () => {
        /** Arrange */

        // create all the users for the test
        const { alice, bob, einstein } = await registerAndStartClients(['alice', 'bob', 'einstein'])
        await bob.fundWallet()

        // create a space with token entitlement

        const readPermission: DataTypes.PermissionStruct = { name: Permission.Read }
        const roomId = await createSpace(bob, [readPermission])

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

        const readPermission: DataTypes.PermissionStruct = { name: Permission.Read }
        const writePermission: DataTypes.PermissionStruct = { name: Permission.Write }
        // create a space with token entitlement to write
        const roomId = await createSpace(bob, [readPermission, writePermission])

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
        try {
            if (roomId && alice.matrixUserId) {
                // Default Read added invariably allows all invitees regardless of token gating
                // Will be fixed here: https://linear.app/hnt-labs/issue/HNT-205/createspacewithtokenentitlement-should-not-add-the-everyone-role-by
                isEntitledRead && (await bob.inviteUser(roomId, alice.matrixUserId))
            }
        } catch (e) {
            /** Assert */
            expect(true).toEqual(false)
        }
        expect(isEntitledRead).toBe(true)
        // alice can't write because she doesn't have token entitlement
        expect(isEntitledWrite).toBe(false)
    }) // end test

    test('Invitee is allowed to write to token gated space with token', async () => {
        /** Arrange */

        // create all the users for the test
        const alice = await registerLoginAndStartClient(
            'tokenGrantedUser',
            TestConstants.FUNDED_WALLET_0,
        )
        const { bob } = await registerAndStartClients(['bob'])
        await bob.fundWallet()

        // create a space with token entitlement to write
        // TODO: allow for adjusted default Everyone permission, to remove
        // default Read which invariably allows all invitees regardless of
        // token gating

        const readPermission: DataTypes.PermissionStruct = { name: Permission.Read }
        const writePermission: DataTypes.PermissionStruct = { name: Permission.Write }

        const roomId = await createSpace(bob, [readPermission, writePermission])
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
            isEntitledRead && (await bob.inviteUser(roomId, alice.matrixUserId))
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
            TestConstants.FUNDED_WALLET_0,
        )
        const { bob } = await registerAndStartClients(['bob'])
        await bob.fundWallet()

        const readPermission: DataTypes.PermissionStruct = { name: Permission.Read }
        // create a space with token entitlement
        const roomId = await createSpace(bob, [readPermission])

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

        const readPermission: DataTypes.PermissionStruct = { name: Permission.Read }
        // create a space with token entitlement
        const roomId = await createSpace(bob, [readPermission])

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
        // Failed due to this bug: https://linear.app/hnt-labs/issue/HNT-205/createspacewithtokenentitlement-should-not-add-the-everyone-role-by
        expect(error).not.toBeInstanceOf(NoThrownError)
        // Forbidden exception because the user does not have Read permission
        expect(error.data).toHaveProperty('errcode', MAXTRIX_ERROR.M_FORBIDDEN)
    }) // end test
}) // end describe
