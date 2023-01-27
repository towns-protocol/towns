/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { CONTRACT_ERROR, NoThrownError, getError } from './helpers/ErrorUtils'
import {
    createExternalTokenStruct,
    getCouncilNftAddress,
    getFilteredRolesFromSpace,
    getZioneerNftAddress,
} from '../../src/client/web3/ContractHelpers'
import {
    createTestSpaceWithEveryoneRole,
    createTestSpaceWithZionMemberRole,
    registerAndStartClients,
    registerLoginAndStartClient,
} from 'use-zion-client/tests/integration/helpers/TestUtils'

import { BigNumber } from 'ethers'
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
        const tokenGrantedUser = await registerLoginAndStartClient(
            'tokenGrantedUser',
            TestConstants.getWalletWithNft(),
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
        expect(roleIdentifier?.roleId).toBeDefined()
        expect(roleIdentifier2?.roleId).toBeDefined()
        expect(roleIdentifier2?.roleId).not.toEqual(roleIdentifier?.roleId)
    })

    test('Space owner is allowed create new role', async () => {
        /** Arrange */
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()
        const roomId = await createTestSpaceWithZionMemberRole(alice, [Permission.Read])

        /** Act */
        // create new role in space
        const permissions = [Permission.Ban]
        const tokenEntitlements: SpaceFactoryDataTypes.ExternalTokenStruct[] = []
        const users: string[] = []

        const roleIdentifier: RoleIdentifier | undefined = await alice.createRole(
            roomId?.networkId as string,
            'newRole1',
            permissions,
            tokenEntitlements,
            users,
        )

        /** Assert */
        expect(roleIdentifier).toBeDefined()
    })

    test('Get role permissions', async () => {
        /** Arrange */
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()
        const roomId = await createTestSpaceWithZionMemberRole(alice, [Permission.Read])
        if (!roomId) {
            throw new Error('roomId is undefined')
        }
        // create new role in space
        const permissions = [Permission.Ban, Permission.Read, Permission.Write, Permission.Redact]
        const tokens: SpaceFactoryDataTypes.ExternalTokenStruct[] = []
        const users: string[] = []
        const roleName = 'newRole1'
        const roleId: RoleIdentifier | undefined = await alice.createRole(
            roomId.networkId,
            roleName,
            permissions,
            tokens,
            users,
        )
        if (!roleId) {
            throw new Error('roleId is undefined')
        }

        /** Act */
        const roleDetails = await alice.spaceDapp.getRole(roomId.networkId, roleId.roleId)
        //console.log(roleDetails)

        /** Assert */
        expect(roleDetails.id).toEqual(roleId.roleId)
        expect(roleDetails.name).toEqual(roleName)
        expect(roleDetails.permissions).toEqual(expect.arrayContaining(permissions))
        expect(roleDetails.permissions.length).toEqual(permissions.length)
        expect(roleDetails.tokens.length).toEqual(0)
        expect(roleDetails.users.length).toEqual(0)
    })

    test('Get details of token member role', async () => {
        /** Arrange */
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()
        const permissions = [Permission.Read, Permission.Write]
        const roomId = await createTestSpaceWithZionMemberRole(alice, permissions)
        if (!roomId) {
            throw new Error('roomId is undefined')
        }

        /** Act */
        const roles = await getFilteredRolesFromSpace(alice, roomId.networkId)
        if (roles.length !== 1) {
            throw new Error(`Expected to find 1 role in space, but found ${roles.length}`)
        }
        const roleDetails = await alice.spaceDapp.getRole(
            roomId.networkId,
            roles[0].roleId.toNumber(),
        )
        //console.log(roleDetails)

        /** Assert */
        const councilNftAddress = getCouncilNftAddress(alice.chainId)
        const expectedToken = createExternalTokenStruct([councilNftAddress])[0]
        expect(roleDetails.tokens.length).toEqual(1)
        expect(roleDetails.tokens[0].contractAddress).toEqual(expectedToken.contractAddress)
        expect(roleDetails.tokens[0].isSingleToken).toEqual(expectedToken.isSingleToken)
        expect(roleDetails.tokens[0].tokenIds).toEqual(expectedToken.tokenIds)
        expect(roleDetails.permissions).toEqual(expect.arrayContaining(permissions))
        expect(roleDetails.permissions.length).toEqual(permissions.length)
    })

    test('Get details of Everyone role', async () => {
        /** Arrange */
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()
        const permissions = [Permission.Read, Permission.Write]
        const roomId = await createTestSpaceWithEveryoneRole(alice, permissions)
        if (!roomId) {
            throw new Error('roomId is undefined')
        }

        /** Act */
        const roles = await getFilteredRolesFromSpace(alice, roomId.networkId)
        if (roles.length !== 1) {
            throw new Error(`Expected to find 1 role in space, but found ${roles.length}`)
        }
        const roleDetails = await alice.spaceDapp.getRole(
            roomId.networkId,
            roles[0].roleId.toNumber(),
        )
        console.log(roleDetails)

        /** Assert */
        expect(roleDetails.name).toEqual('Everyone')
        expect(roleDetails.tokens.length).toEqual(0)
        expect(roleDetails.users.length).toEqual(1)
        expect(roleDetails.users[0]).toEqual(TestConstants.EveryoneAddress)
        expect(roleDetails.permissions).toEqual(expect.arrayContaining(permissions))
        expect(roleDetails.permissions.length).toEqual(permissions.length)
    })

    test('Get details of role with token entitlement', async () => {
        /** Arrange */
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()
        const roomId = await createTestSpaceWithZionMemberRole(alice, [Permission.Read])
        if (!roomId) {
            throw new Error('roomId is undefined')
        }
        // create new role in space
        const permissions = [Permission.Read, Permission.Write, Permission.Redact]
        const councilNftAddress = getCouncilNftAddress(alice.chainId)
        const zioneerNftAddress = getZioneerNftAddress(alice.chainId)
        const tokens = createExternalTokenStruct([councilNftAddress, zioneerNftAddress])
        const expectedCouncilToken = tokens[0]
        const expectedZioneerToken = tokens[1]
        const users: string[] = []
        const roleName = 'newRole1'
        const roleId: RoleIdentifier | undefined = await alice.createRole(
            roomId.networkId,
            roleName,
            permissions,
            tokens,
            users,
        )
        if (!roleId) {
            throw new Error('roleId is undefined')
        }

        /** Act */
        const roleDetails = await alice.spaceDapp.getRole(roomId.networkId, roleId.roleId)
        console.log(roleDetails)

        /** Assert */
        expect(roleDetails.id).toEqual(roleId.roleId)
        expect(roleDetails.tokens.length).toEqual(2)
        expect(roleDetails.tokens[0].contractAddress).toEqual(expectedCouncilToken.contractAddress)
        expect(roleDetails.tokens[0].isSingleToken).toEqual(expectedCouncilToken.isSingleToken)
        expect(roleDetails.tokens[0].tokenIds).toEqual(expectedCouncilToken.tokenIds)
        let quantity = roleDetails.tokens[0].quantity as BigNumber
        expect(quantity.toNumber()).toEqual(expectedCouncilToken.quantity)
        expect(roleDetails.tokens[1].contractAddress).toEqual(expectedZioneerToken.contractAddress)
        expect(roleDetails.tokens[1].isSingleToken).toEqual(expectedZioneerToken.isSingleToken)
        quantity = roleDetails.tokens[1].quantity as BigNumber
        expect(quantity.toNumber()).toEqual(expectedZioneerToken.quantity)
        expect(roleDetails.tokens[1].tokenIds).toEqual(expectedZioneerToken.tokenIds)
    })

    test('Get details of role with user entitlement', async () => {
        /** Arrange */
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()
        const roomId = await createTestSpaceWithZionMemberRole(alice, [Permission.Read])
        if (!roomId) {
            throw new Error('roomId is undefined')
        }
        // create new role in space
        const permissions = [Permission.Read, Permission.Write]
        const tokens: SpaceFactoryDataTypes.ExternalTokenStruct[] = []
        const users: string[] = [
            '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
            '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
        ]
        const roleName = 'newRole1'
        const roleId: RoleIdentifier | undefined = await alice.createRole(
            roomId.networkId,
            roleName,
            permissions,
            tokens,
            users,
        )
        if (!roleId) {
            throw new Error('roleId is undefined')
        }

        /** Act */
        const roleDetails = await alice.spaceDapp.getRole(roomId.networkId, roleId.roleId)
        //console.log(roleDetails)

        /** Assert */
        expect(roleDetails.id).toEqual(roleId.roleId)
        expect(roleDetails.users.length).toEqual(2)
        expect(roleDetails.users).toEqual(expect.arrayContaining(users))
    })
})
