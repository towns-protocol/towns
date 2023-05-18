/**
 * @group casablanca
 * @group dendrite
 */
import { CONTRACT_ERROR, NoThrownError, getError } from './helpers/ErrorUtils'
import {
    createTestSpaceWithZionMemberRole,
    registerAndStartClients,
    registerAndStartClient,
} from 'use-zion-client/tests/integration/helpers/TestUtils'

import { Permission } from 'use-zion-client/src/client/web3/ContractTypes'
import { RoleIdentifier } from '../../src/types/web3-types'
import { SpaceFactoryDataTypes } from '../../src/client/web3/shims/SpaceFactoryShim'
import { TestConstants } from './helpers/TestConstants'

describe('create role', () => {
    test('Space owner is allowed create new role', async () => {
        /** Arrange */
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()
        const roomId = await createTestSpaceWithZionMemberRole(alice, [Permission.Read])
        if (!roomId) {
            throw new Error('roomId is undefined')
        }

        /** Act */
        // create new role in space
        const permissions = [Permission.Ban]
        const tokens: SpaceFactoryDataTypes.ExternalTokenStruct[] = []
        const users: string[] = []

        const roleIdentifier: RoleIdentifier | undefined = await alice.createRole(
            roomId.networkId,
            'newRole1',
            permissions,
            tokens,
            users,
        )

        /** Assert */
        expect(roleIdentifier).toBeDefined()
    })

    test('Space member not allowed to create new role without permission', async () => {
        /** Arrange */
        const tokenGrantedUser = await registerAndStartClient(
            'tokenGrantedUser',
            TestConstants.getWalletWithMemberNft(),
        )
        const { bob } = await registerAndStartClients(['bob'])
        await bob.fundWallet()

        const roomId = await createTestSpaceWithZionMemberRole(bob, [Permission.Read])
        if (!roomId) {
            throw new Error('roomId is undefined')
        }

        /** Act & Assert */
        // Try to create new role in space without permission
        const permissions = [Permission.Ban]
        const tokens: SpaceFactoryDataTypes.ExternalTokenStruct[] = []
        const users: string[] = []
        const error = await getError<Error>(async function () {
            await tokenGrantedUser.createRole(
                roomId.networkId,
                'newRole1',
                permissions,
                tokens,
                users,
            )
        })

        /* Assert */
        // check that the returned error wasn't that no error was thrown.
        expect(error).not.toBeInstanceOf(NoThrownError)
        expect(error).toHaveProperty('name', CONTRACT_ERROR.NotAllowed)
    })

    test('Space member allowed to create new role with permission', async () => {
        /** Arrange */
        const tokenGrantedUser = await registerAndStartClient(
            'tokenGrantedUser',
            TestConstants.getWalletWithMemberNft(),
        )
        const { bob } = await registerAndStartClients(['bob'])
        await bob.fundWallet()

        const roomId = await createTestSpaceWithZionMemberRole(bob, [
            Permission.Read,
            Permission.ModifySpaceSettings,
        ])
        if (!roomId) {
            throw new Error('roomId is undefined')
        }

        /** Act */
        // create new role in space
        const permissions = [Permission.Ban]
        const tokens: SpaceFactoryDataTypes.ExternalTokenStruct[] = []
        const users: string[] = []
        const roleIdentifier: RoleIdentifier | undefined = await tokenGrantedUser.createRole(
            roomId.networkId,
            'newRole1',
            permissions,
            tokens,
            users,
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
        const permissions = [Permission.Ban]
        const tokens: SpaceFactoryDataTypes.ExternalTokenStruct[] = []
        const users: string[] = []
        const roleIdentifier: RoleIdentifier | undefined = await alice.createRole(
            roomId?.networkId as string,
            'newRole1',
            permissions,
            tokens,
            users,
        )
        const roleIdentifier2: RoleIdentifier | undefined = await alice.createRole(
            roomId?.networkId as string,
            'newRole2',
            permissions,
            tokens,
            users,
        )

        /** Assert */
        expect(roleIdentifier).toBeDefined()
        expect(roleIdentifier2).toBeDefined()
        if (roleIdentifier && roleIdentifier2) {
            expect(roleIdentifier.roleId).toBeDefined()
            expect(roleIdentifier2.roleId).toBeDefined()
            expect(roleIdentifier2.roleId).not.toEqual(roleIdentifier?.roleId)
        }
    })
})
