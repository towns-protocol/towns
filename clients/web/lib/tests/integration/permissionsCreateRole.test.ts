/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { CONTRACT_ERROR, NoThrownError, getError } from './helpers/ErrorUtils'
import {
    createTestSpaceWithZionMemberRole,
    registerAndStartClients,
    registerLoginAndStartClient,
} from 'use-zion-client/tests/integration/helpers/TestUtils'

import { DataTypes } from '../../src/client/web3/shims/ZionSpaceManagerShim'
import { Permission } from 'use-zion-client/src/client/web3/ZionContractTypes'
import { RoleIdentifier } from '../../src/types/web3-types'
import { TestConstants } from './helpers/TestConstants'

describe('create role', () => {
    jest.setTimeout(TestConstants.DefaultJestTimeout)

    test('Space owner is allowed to disable space access', async () => {
        /** Arrange */

        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()

        const roomId = await createTestSpaceWithZionMemberRole(alice, [Permission.Read])
        const spaceNetworkId: string | undefined = roomId?.matrixRoomId
        /** Act */
        // set space access off, disabling space in ZionSpaceManager
        const success: boolean | undefined = await alice.setSpaceAccess(
            spaceNetworkId as string,
            true,
        )

        const spaceInfo: DataTypes.SpaceInfoStruct = await alice.getSpaceInfoBySpaceId(
            spaceNetworkId as string,
        )

        /** Assert */
        expect(success).toEqual(true)
        expect(spaceInfo.disabled).toEqual(true)
        expect(spaceInfo.networkId).toEqual(spaceNetworkId)
    })

    test('Space owner is allowed to re-enable disabled space access', async () => {
        /** Arrange */

        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()

        const roomId = await createTestSpaceWithZionMemberRole(alice, [Permission.Read])
        const spaceNetworkId: string | undefined = roomId?.matrixRoomId
        /** Act */
        // set space access off, disabling space in ZionSpaceManager
        const disabled: boolean | undefined = await alice.setSpaceAccess(
            spaceNetworkId as string,
            true,
        )
        // set space access on, re-enabling space in ZionSpaceManager
        const enabled: boolean | undefined = await alice.setSpaceAccess(
            spaceNetworkId as string,
            false,
        )
        const spaceInfo: DataTypes.SpaceInfoStruct = await alice.getSpaceInfoBySpaceId(
            spaceNetworkId as string,
        )

        /** Assert */
        expect(disabled).toEqual(true)
        expect(enabled).toEqual(true)
        expect(spaceInfo.disabled).toEqual(false)
        expect(spaceInfo.networkId).toEqual(spaceNetworkId)
    })

    test('Space member is not allowed to disable space access', async () => {
        /** Arrange */

        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        await alice.fundWallet()
        await bob.fundWallet()

        const roomId = await createTestSpaceWithZionMemberRole(alice, [Permission.Read])
        const spaceNetworkId: string | undefined = roomId?.matrixRoomId
        /** Act */
        // set space access off, disabling space in ZionSpaceManager
        const error = await getError<Error>(async function () {
            await bob.setSpaceAccess(spaceNetworkId as string, true)
        })

        /* Assert */
        // check that the returned error wasn't that no error was thrown.
        expect(error).not.toBeInstanceOf(NoThrownError)
        expect(error).toHaveProperty('name', CONTRACT_ERROR.NotAllowed)
    })

    test('Space owner is allowed create new role', async () => {
        /** Arrange */

        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()
        const roomId = await createTestSpaceWithZionMemberRole(alice, [Permission.Read])

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
            TestConstants.getWalletWithNft(),
        )
        const { bob } = await registerAndStartClients(['bob'])
        await bob.fundWallet()

        const roomId = await createTestSpaceWithZionMemberRole(bob, [Permission.Read])
        /** Act & Assert */
        // Try to create new role in space without permission
        const error = await getError<Error>(async function () {
            await tokenGrantedUser.createRole(roomId?.matrixRoomId as string, 'newRole1')
        })

        /* Assert */
        // check that the returned error wasn't that no error was thrown.
        expect(error).not.toBeInstanceOf(NoThrownError)
        expect(error).toHaveProperty('name', CONTRACT_ERROR.NotAllowed)
    })

    test('Space member allowed to create new role with permission', async () => {
        /** Arrange */
        const tokenGrantedUser = await registerLoginAndStartClient(
            'tokenGrantedUser',
            TestConstants.getWalletWithNft(),
        )
        const { bob } = await registerAndStartClients(['bob'])
        await bob.fundWallet()

        const roomId = await createTestSpaceWithZionMemberRole(bob, [
            Permission.Read,
            Permission.ModifySpacePermissions,
        ])
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

        const roomId = await createTestSpaceWithZionMemberRole(alice, [Permission.Read])
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
