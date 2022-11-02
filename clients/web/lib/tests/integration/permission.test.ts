/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { MAXTRIX_ERROR, NoThrownError, getError, MatrixError } from './helpers/ErrorUtils'
import {
    createSpace,
    registerAndStartClients,
    registerLoginAndStartClient,
} from 'use-zion-client/tests/integration/helpers/TestUtils'

import { waitFor } from '@testing-library/dom'
import { Permission } from 'use-zion-client/src/client/web3/ZionContractTypes'
import { Room, RoomIdentifier } from 'use-zion-client/src/types/matrix-types'
import { TestConstants } from './helpers/TestConstants'
import { DataTypes } from '../../src/client/web3/shims/ZionSpaceManagerShim'
import { RoleIdentifier } from '../../src/types/web3-types'
import { MatrixEvent } from 'matrix-js-sdk'

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

describe.skip('write messages', () => {
    //describe.only('write messages', () => {
    jest.setTimeout(3000 * 1000)

    test('Channel member cant write messages without permission', async () => {
        /** Arrange */

        // create all the users for the test
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        await bob.fundWallet()

        // create a space with token entitlement to write
        const readPermission: DataTypes.PermissionStruct = { name: Permission.Read }
        const writePermission: DataTypes.PermissionStruct = { name: Permission.Write }

        const roomId = await createSpace(bob, [readPermission, writePermission], [readPermission])

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
            { timeout: 10000 },
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
            { timeout: 10000 },
        )
    })

    test('Channel member can sync messages', async () => {
        /** Arrange */

        // create all the users for the test
        const tokenGrantedUser = await registerLoginAndStartClient(
            'tokenGrantedUser',
            TestConstants.FUNDED_WALLET_0,
        )
        const { bob } = await registerAndStartClients(['bob'])
        await bob.fundWallet()

        // create a space with token entitlement to write
        const readPermission: DataTypes.PermissionStruct = { name: Permission.Read }
        const writePermission: DataTypes.PermissionStruct = { name: Permission.Write }

        const roomId = await createSpace(bob, [readPermission, writePermission])

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
        await waitFor(() =>
            expect(tokenGrantedUser.getRoom(roomId as RoomIdentifier)).toBeDefined(),
        )

        // call scrollback
        await tokenGrantedUser.scrollback(roomId as RoomIdentifier, 30)

        // we should get more events
        await waitFor(() =>
            expect(
                tokenGrantedUser
                    .getRoom(roomId as RoomIdentifier)
                    ?.getLiveTimeline()
                    .getEvents().length,
            ).toBeGreaterThan(20),
        )
    })

    test('Channel member can write messages', async () => {
        /** Arrange */

        // create all the users for the test
        const tokenGrantedUser = await registerLoginAndStartClient(
            'tokenGrantedUser',
            TestConstants.FUNDED_WALLET_0,
        )
        const { bob } = await registerAndStartClients(['bob'])
        await bob.fundWallet()

        // create a space with token entitlement to write
        const readPermission: DataTypes.PermissionStruct = { name: Permission.Read }
        const writePermission: DataTypes.PermissionStruct = { name: Permission.Write }

        const roomId = await createSpace(bob, [readPermission, writePermission])

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
            { timeout: 10000 },
        )
    })
})

describe.skip('create role', () => {
    //describe.only('create role', () => {
    jest.setTimeout(300 * 1000)

    test('Space owner is allowed create new role', async () => {
        /** Arrange */

        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()

        const readPermission: DataTypes.PermissionStruct = { name: Permission.Read }
        const roomId = await createSpace(alice, [readPermission])
        /** Act */
        // create new role in space
        const roleIdentifier: RoleIdentifier | undefined = await alice.createRole(
            roomId?.matrixRoomId as string,
            'newRole1',
        )

        /** Assert */
        expect(roleIdentifier).toBeDefined()
    })

    test('Space member not allowed to create new role without permission', async () => {
        /** Arrange */
        const tokenGrantedUser = await registerLoginAndStartClient(
            'tokenGrantedUser',
            TestConstants.FUNDED_WALLET_0,
        )
        const { bob } = await registerAndStartClients(['bob'])
        await bob.fundWallet()

        const readPermission: DataTypes.PermissionStruct = { name: Permission.Read }
        const roomId = await createSpace(bob, [readPermission])
        /** Act */
        // create new role in space
        const roleIdentifier: RoleIdentifier | undefined = await tokenGrantedUser.createRole(
            roomId?.matrixRoomId as string,
            'newRole1',
        )

        /** Assert */
        expect(roleIdentifier).not.toBeDefined()
    })

    test('Space member allowed to create new role with permission', async () => {
        /** Arrange */
        const tokenGrantedUser = await registerLoginAndStartClient(
            'tokenGrantedUser',
            TestConstants.FUNDED_WALLET_0,
        )
        const { bob } = await registerAndStartClients(['bob'])
        await bob.fundWallet()

        const readPermission: DataTypes.PermissionStruct = { name: Permission.Read }
        const modifySpacePermission: DataTypes.PermissionStruct = {
            name: Permission.ModifySpacePermissions,
        }
        const roomId = await createSpace(bob, [readPermission, modifySpacePermission])
        /** Act */
        // create new role in space
        const roleIdentifier: RoleIdentifier | undefined = await tokenGrantedUser.createRole(
            roomId?.matrixRoomId as string,
            'newRole1',
        )

        /** Assert */
        expect(roleIdentifier).toBeDefined()
    })

    test('Space owner is allowed create multiple roles', async () => {
        /** Arrange */

        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()

        const readPermission: DataTypes.PermissionStruct = { name: Permission.Read }
        const roomId = await createSpace(alice, [readPermission])
        /** Act */
        // create new role in space
        const roleIdentifier: RoleIdentifier | undefined = await alice.createRole(
            roomId?.matrixRoomId as string,
            'newRole1',
        )
        const roleIdentifier2: RoleIdentifier | undefined = await alice.createRole(
            roomId?.matrixRoomId as string,
            'newRole1',
        )
        /** Assert */
        expect(roleIdentifier?.roleId).toBeDefined()
        expect(roleIdentifier2?.roleId).toBeDefined()
        expect(roleIdentifier2?.roleId).not.toEqual(roleIdentifier?.roleId)
    })
})

describe.skip('space invite', () => {
    //describe.only('space invite', () => {
    jest.setTimeout(300 * 1000)

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
        expect(error).not.toBeInstanceOf(NoThrownError)
        // Forbidden exception because the user does not have Read permission
        expect(error.data).toHaveProperty('errcode', MAXTRIX_ERROR.M_FORBIDDEN)
    }) // end test
}) // end describe
