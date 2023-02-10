/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { BigNumber, ContractReceipt } from 'ethers'
import {
    CONTRACT_ERROR,
    NoThrownError,
    getError,
    MatrixError,
    MAXTRIX_ERROR,
} from './helpers/ErrorUtils'
import { Permission, RoleDetails } from 'use-zion-client/src/client/web3/ContractTypes'
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

import { RoleIdentifier } from '../../src/types/web3-types'
import { SpaceFactoryDataTypes } from '../../src/client/web3/shims/SpaceFactoryShim'
import { TestConstants } from './helpers/TestConstants'
import { TokenDataTypes } from '../../src/client/web3/shims/TokenEntitlementShim'
import { Room, RoomVisibility } from '../../src/types/zion-types'

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
        expect(roleIdentifier).toBeDefined()
        expect(roleIdentifier2).toBeDefined()
        if (roleIdentifier && roleIdentifier2) {
            expect(roleIdentifier.roleId).toBeDefined()
            expect(roleIdentifier2.roleId).toBeDefined()
            expect(roleIdentifier2.roleId).not.toEqual(roleIdentifier?.roleId)
        }
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
        expect(roleDetails).toBeDefined()
        if (roleDetails) {
            expect(roleDetails.id).toEqual(roleId.roleId)
            expect(roleDetails.name).toEqual(roleName)
            expect(roleDetails.permissions).toEqual(expect.arrayContaining(permissions))
            expect(roleDetails.permissions.length).toEqual(permissions.length)
            expect(roleDetails.tokens.length).toEqual(0)
            expect(roleDetails.users.length).toEqual(0)
        }
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
        expect(roleDetails).toBeDefined()
        if (roleDetails) {
            expect(roleDetails.tokens.length).toEqual(1)
            expect(roleDetails.tokens[0].contractAddress).toEqual(expectedToken.contractAddress)
            expect(roleDetails.tokens[0].isSingleToken).toEqual(expectedToken.isSingleToken)
            expect(roleDetails.tokens[0].tokenIds).toEqual(expectedToken.tokenIds)
            expect(roleDetails.permissions).toEqual(expect.arrayContaining(permissions))
            expect(roleDetails.permissions.length).toEqual(permissions.length)
        }
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
        expect(roleDetails).toBeDefined()
        if (roleDetails) {
            expect(roleDetails.name).toEqual('Everyone')
            expect(roleDetails.tokens.length).toEqual(0)
            expect(roleDetails.users.length).toEqual(1)
            expect(roleDetails.users[0]).toEqual(TestConstants.EveryoneAddress)
            expect(roleDetails.permissions).toEqual(expect.arrayContaining(permissions))
            expect(roleDetails.permissions.length).toEqual(permissions.length)
        }
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
        expect(roleDetails).toBeDefined()
        if (roleDetails) {
            expect(roleDetails.id).toEqual(roleId.roleId)
            expect(roleDetails.tokens.length).toEqual(2)
            expect(roleDetails.tokens[0].contractAddress).toEqual(
                expectedCouncilToken.contractAddress,
            )
            expect(roleDetails.tokens[0].isSingleToken).toEqual(expectedCouncilToken.isSingleToken)
            expect(roleDetails.tokens[0].tokenIds).toEqual(expectedCouncilToken.tokenIds)
            let quantity = roleDetails.tokens[0].quantity as BigNumber
            expect(quantity.toNumber()).toEqual(expectedCouncilToken.quantity)
            expect(roleDetails.tokens[1].contractAddress).toEqual(
                expectedZioneerToken.contractAddress,
            )
            expect(roleDetails.tokens[1].isSingleToken).toEqual(expectedZioneerToken.isSingleToken)
            quantity = roleDetails.tokens[1].quantity as BigNumber
            expect(quantity.toNumber()).toEqual(expectedZioneerToken.quantity)
            expect(roleDetails.tokens[1].tokenIds).toEqual(expectedZioneerToken.tokenIds)
        }
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
        expect(roleDetails).toBeDefined()
        if (roleDetails) {
            expect(roleDetails.id).toEqual(roleId.roleId)
            expect(roleDetails.users.length).toEqual(2)
            expect(roleDetails.users).toEqual(expect.arrayContaining(users))
        }
    })

    test('Update Everyone role with multicall', async () => {
        /** Arrange */
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()
        const roomId = await createTestSpaceWithEveryoneRole(alice, [Permission.Ban])
        if (!roomId) {
            throw new Error('roomId is undefined')
        }
        // get current role details
        const spaceNetworkId = roomId.networkId
        const roles = await getFilteredRolesFromSpace(alice, spaceNetworkId)
        if (roles.length !== 1) {
            throw new Error(`Expected to find 1 role in space, but found ${roles.length}`)
        }
        const roleId = roles[0].roleId.toNumber()
        const roleDetails = await alice.spaceDapp.getRole(spaceNetworkId, roleId)
        if (!roleDetails) {
            throw new Error('roleDetails is undefined')
        }

        /** Act */
        // change the role details
        const newRoleName = 'newRoleName'
        const newPermissions = [Permission.Read, Permission.Write, Permission.Redact]
        const transaction = await alice.spaceDapp.updateRole({
            spaceNetworkId,
            roleId,
            roleName: newRoleName,
            permissions: newPermissions,
            tokens: roleDetails.tokens,
            users: roleDetails.users,
        })
        const receipt = await transaction.wait()

        /** Assert */
        expect(receipt?.status).toEqual(1)
        const actual = await alice.spaceDapp.getRole(spaceNetworkId, roleId)
        expect(actual).toBeDefined()
        if (actual) {
            expect(actual.name).toEqual(newRoleName)
            expect(actual.permissions.length).toEqual(newPermissions.length)
            expect(actual.permissions).toEqual(expect.arrayContaining(newPermissions))
        }
    })

    test('Update token-gated role with multicall', async () => {
        /** Arrange */
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()
        const roomId = await createTestSpaceWithZionMemberRole(alice, [Permission.Ban])
        if (!roomId) {
            throw new Error('roomId is undefined')
        }
        // get current role details
        const spaceNetworkId = roomId.networkId
        const roles = await getFilteredRolesFromSpace(alice, spaceNetworkId)
        if (roles.length !== 1) {
            throw new Error(`Expected to find 1 role in space, but found ${roles.length}`)
        }
        const roleId = roles[0].roleId.toNumber()
        const roleDetails = await alice.spaceDapp.getRole(spaceNetworkId, roleId)
        if (!roleDetails) {
            throw new Error('roleDetails is undefined')
        }

        /** Act */
        // change the role details
        const newRoleName = 'newRoleName'
        const newPermissions = [Permission.Read, Permission.Write, Permission.Redact]
        const zioneerNftAddress = getZioneerNftAddress(alice.chainId)
        // test space was created with council token. replace with zioneer token
        const newTokens = createExternalTokenStruct([zioneerNftAddress])
        const transaction = await alice.spaceDapp.updateRole({
            spaceNetworkId,
            roleId,
            roleName: newRoleName,
            permissions: newPermissions,
            tokens: newTokens,
            users: roleDetails.users,
        })
        let receipt: ContractReceipt | undefined
        try {
            receipt = await transaction.wait()
        } catch (e) {
            const error = await alice.spaceDapp.parseSpaceError(spaceNetworkId, e)
            console.error(error)
            // fail the test.
            throw e
        }

        /** Assert */
        expect(receipt?.status).toEqual(1)
        const actual = await alice.spaceDapp.getRole(spaceNetworkId, roleId)
        if (actual) {
            expect(actual.name).toEqual(newRoleName)
            expect(actual.permissions.length).toEqual(newPermissions.length)
            expect(actual.permissions).toEqual(expect.arrayContaining(newPermissions))
            expect(actual.tokens.length).toEqual(newTokens.length)
            const actualTokenAddresses = actual.tokens.map((t) => t.contractAddress)
            const expectedTokenAddresses = newTokens.map((t) => t.contractAddress)
            expect(actualTokenAddresses).toEqual(expect.arrayContaining(expectedTokenAddresses))
        }
    })

    test('Update moderator role with multicall', async () => {
        /** Arrange */
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()
        const roomId = await createTestSpaceWithZionMemberRole(alice, [
            Permission.Read,
            Permission.Write,
        ])
        if (!roomId) {
            throw new Error('roomId is undefined')
        }
        // create a new role
        const moderatorPermissions = [Permission.Read, Permission.Write, Permission.Ban]
        const moderatorTokens: TokenDataTypes.ExternalTokenStruct[] = []
        // replace the current moderator with this user
        const moderatorUsers: string[] = ['0x70997970C51812dc3A010C7d01b50e0d17dc79C8']
        const moderatorRoleName = 'Moderator'
        const moderatorRoleId = await alice.createRole(
            roomId.networkId,
            moderatorRoleName,
            moderatorPermissions,
            moderatorTokens,
            moderatorUsers,
        )
        if (!moderatorRoleId) {
            throw new Error('moderatorRoleId is undefined')
        }
        // get current role details for the Moderator role and the Member role
        const spaceNetworkId = roomId.networkId
        let roles = await getFilteredRolesFromSpace(alice, spaceNetworkId)
        if (roles.length !== 2) {
            throw new Error(`Expected to find 2 roles in space, but found ${roles.length}`)
        }
        let expectedMemberRole: RoleDetails | undefined
        for (const role of roles) {
            if (role.name === 'Member') {
                // this is the role we are not updating
                // get the role details to assert that they have not changed
                expectedMemberRole = await alice.spaceDapp.getRole(
                    roomId.networkId,
                    role.roleId.toNumber(),
                )
            } else if (role.name === moderatorRoleName) {
                // this is the role we are updating
                // get the role details after it has been updated
                // to assert that the details have changed
            } else {
                // unexpected role. fail the test
                throw new Error(`Unexpected role name: ${role.name}`)
            }
        }
        if (!expectedMemberRole) {
            throw new Error('expectedMemberRole is undefined')
        }

        /** Act */
        // replacing one moderator with another moderator
        const newModeratorUsers = ['0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65']
        const newModeratorRole: RoleDetails = {
            id: moderatorRoleId.roleId,
            name: moderatorRoleName,
            permissions: moderatorPermissions,
            tokens: moderatorTokens,
            users: newModeratorUsers,
        }
        let receipt: ContractReceipt | undefined
        try {
            const transaction = await alice.spaceDapp.updateRole({
                spaceNetworkId,
                roleId: newModeratorRole.id,
                roleName: newModeratorRole.name,
                permissions: newModeratorRole.permissions,
                tokens: newModeratorRole.tokens,
                users: newModeratorRole.users,
            })

            receipt = await transaction.wait()
        } catch (e) {
            const error = await alice.spaceDapp.parseSpaceError(spaceNetworkId, e)
            console.error(error)
            // fail the test.
            throw e
        }

        /** Assert */
        expect(receipt?.status).toEqual(1)
        roles = await getFilteredRolesFromSpace(alice, spaceNetworkId)
        for (const role of roles) {
            const actual = await alice.spaceDapp.getRole(spaceNetworkId, role.roleId.toNumber())
            expect(actual).toBeDefined()
            if (actual) {
                if (role.name === 'Member') {
                    // this is the role we are not updating
                    // assert that they have not changed
                    assertRoleEquals(actual, expectedMemberRole)
                } else if (role.name === moderatorRoleName) {
                    // this is the role we are updating
                    // assert that they have been updated
                    assertRoleEquals(actual, newModeratorRole)
                } else {
                    throw new Error(`Unexpected role name: ${role.name}`)
                }
            }
        }
    })

    test('Delete token-gated role with a channel using it', async () => {
        /** Arrange */
        const { alice } = await registerAndStartClients(['alice'])
        const bobWithNft = await registerLoginAndStartClient(
            'bobWithNft',
            TestConstants.getWalletWithNft(),
        )
        if (!bobWithNft.walletAddress) {
            throw new Error('bobWithNft.walletAddress is undefined')
        }
        const newRoleName = 'newRole1'
        const newPermissions = [Permission.Read, Permission.Write]
        const newNftAddress = getCouncilNftAddress(alice.chainId)
        const newTokens = createExternalTokenStruct([newNftAddress])
        const newUsers: string[] = []
        // create a new test space
        await alice.fundWallet()
        const roomId = await createTestSpaceWithZionMemberRole(alice, [
            Permission.Read,
            Permission.Write,
        ])
        if (!roomId) {
            throw new Error('roomId is undefined')
        }
        const spaceId = roomId.networkId
        // create a new role
        const roleIdentifier: RoleIdentifier | undefined = await alice.createRole(
            spaceId,
            newRoleName,
            newPermissions,
            newTokens,
            newUsers,
        )
        if (!roleIdentifier) {
            throw new Error('roleIdentifier is undefined')
        }
        const roleId = roleIdentifier.roleId
        // create a channel with the role
        const channel = await alice.createChannel({
            name: 'test_channel',
            visibility: RoomVisibility.Public,
            parentSpaceId: roomId,
            roleIds: [roleId],
        })
        if (!channel) {
            throw new Error('channel is undefined')
        }
        // sanity check: bob joins the space successfully
        await bobWithNft.joinRoom(channel, spaceId)
        // bob leaves the room so that we can delete the role, and test
        // that bob can no longer join the room
        await bobWithNft.leave(channel, spaceId)

        /** Act */
        let receipt: ContractReceipt | undefined
        let rejoinedRoom: Room | undefined
        try {
            // delete the role
            const transaction = await alice.spaceDapp.deleteRole(spaceId, roleIdentifier.roleId)
            receipt = await transaction.wait()
        } catch (e) {
            // unexpected error. fail the test.
            const error = await alice.spaceDapp.parseSpaceError(spaceId, e)
            console.error(error)
            throw error
        }
        // bob tries to join the room again
        // expect that bob cannot join the room
        const error = await getError<MatrixError>(async function () {
            rejoinedRoom = await bobWithNft.joinRoom(channel, spaceId)
        })

        /** Assert */
        // verify transaction was successful
        expect(receipt?.status).toEqual(1)
        // verfy bob cannot join the room
        expect(rejoinedRoom).toBeUndefined()
        // verify error was thrown.
        expect(error).not.toBeInstanceOf(NoThrownError)
        expect(error).toHaveProperty('name', MAXTRIX_ERROR.M_FORBIDDEN)
        // verify role is deleted
        const actual = await alice.spaceDapp.getRole(spaceId, roleId)
        expect(actual).toBeUndefined()
        // verify bob is still entitled to the space
        expect(
            await bobWithNft.spaceDapp.isEntitledToSpace(
                spaceId,
                bobWithNft.walletAddress,
                Permission.Read,
            ),
        ).toBe(true)
        // verify bob is no longer entitled to the channel
        expect(
            await bobWithNft.spaceDapp.isEntitledToChannel(
                spaceId,
                channel.networkId,
                bobWithNft.walletAddress,
                Permission.Read,
            ),
        ).toBe(false)
    })

    test('Delete user-gated role with a channel using it', async () => {
        /** Arrange */
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        if (!bob.walletAddress) {
            throw new Error('bob.walletAddress is undefined')
        }
        const newRoleName = 'newRole1'
        const newPermissions = [Permission.Read, Permission.Write]
        const newTokens: SpaceFactoryDataTypes.ExternalTokenStruct[] = []
        // add bob to the users list
        const newUsers: string[] = [bob.walletAddress]
        // create a new test space
        await alice.fundWallet()
        const roomId = await createTestSpaceWithZionMemberRole(alice, [
            Permission.Read,
            Permission.Write,
        ])
        if (!roomId) {
            throw new Error('roomId is undefined')
        }
        const spaceId = roomId.networkId
        // create a new role
        const roleIdentifier: RoleIdentifier | undefined = await alice.createRole(
            spaceId,
            newRoleName,
            newPermissions,
            newTokens,
            newUsers,
        )
        if (!roleIdentifier) {
            throw new Error('roleIdentifier is undefined')
        }
        const roleId = roleIdentifier.roleId
        // create a channel with the role
        const channel = await alice.createChannel({
            name: 'test_channel',
            visibility: RoomVisibility.Public,
            parentSpaceId: roomId,
            roleIds: [roleId],
        })
        if (!channel) {
            throw new Error('channel is undefined')
        }
        // sanity check: bob joins the space successfully
        await bob.joinRoom(channel, spaceId)
        // bob leaves the room so that we can delete the role, and test
        // that bob can no longer join the room
        await bob.leave(channel, spaceId)

        /** Act */
        let receipt: ContractReceipt | undefined
        let rejoinedRoom: Room | undefined
        try {
            // delete the role
            const transaction = await alice.spaceDapp.deleteRole(spaceId, roleIdentifier.roleId)
            receipt = await transaction.wait()
        } catch (e) {
            // unexpected error. fail the test.
            const error = await alice.spaceDapp.parseSpaceError(spaceId, e)
            console.error(error)
            throw error
        }
        // bob tries to join the room again
        // expect that bob cannot join the room
        const error = await getError<MatrixError>(async function () {
            rejoinedRoom = await bob.joinRoom(channel, spaceId)
        })

        /** Assert */
        // verify transaction was successful
        expect(receipt?.status).toEqual(1)
        // verfy bob cannot join the room
        expect(rejoinedRoom).toBeUndefined()
        // verify error was thrown.
        expect(error).not.toBeInstanceOf(NoThrownError)
        expect(error).toHaveProperty('name', MAXTRIX_ERROR.M_FORBIDDEN)
        // verify role is deleted
        const actual = await alice.spaceDapp.getRole(spaceId, roleId)
        expect(actual).toBeUndefined()
        // verify bob is not entitled to the space
        expect(
            await bob.spaceDapp.isEntitledToSpace(spaceId, bob.walletAddress, Permission.Read),
        ).toBe(false)
        // verify bob is no longer entitled to the channel
        expect(
            await bob.spaceDapp.isEntitledToChannel(
                spaceId,
                channel.networkId,
                bob.walletAddress,
                Permission.Read,
            ),
        ).toBe(false)
    })

    test('Delete a role with no channels using it', async () => {
        /** Arrange */
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        if (!alice.walletAddress) {
            throw new Error('alice.walletAddress is undefined')
        }
        if (!bob.walletAddress) {
            throw new Error('bob.walletAddress is undefined')
        }
        const newRoleName = 'newRole1'
        const newPermissions = [Permission.Read, Permission.Write]
        const newTokens: SpaceFactoryDataTypes.ExternalTokenStruct[] = []
        // add bob to the users list
        const newUsers: string[] = [bob.walletAddress]
        // create a new test space
        await alice.fundWallet()
        const roomId = await createTestSpaceWithZionMemberRole(alice, [
            Permission.Read,
            Permission.Write,
        ])
        if (!roomId) {
            throw new Error('roomId is undefined')
        }
        const spaceId = roomId.networkId
        // create a new role
        const roleIdentifier: RoleIdentifier | undefined = await alice.createRole(
            spaceId,
            newRoleName,
            newPermissions,
            newTokens,
            newUsers,
        )
        if (!roleIdentifier) {
            throw new Error('roleIdentifier is undefined')
        }
        const roleId = roleIdentifier.roleId

        /** Act */
        let receipt: ContractReceipt | undefined
        try {
            // delete the role
            const transaction = await alice.spaceDapp.deleteRole(spaceId, roleIdentifier.roleId)
            receipt = await transaction.wait()
        } catch (e) {
            // unexpected error. fail the test.
            const error = await alice.spaceDapp.parseSpaceError(spaceId, e)
            console.error(error)
            throw error
        }

        /** Assert */
        // verify transaction was successful
        expect(receipt?.status).toEqual(1)
        // verify role is deleted
        const actual = await alice.spaceDapp.getRole(spaceId, roleId)
        expect(actual).toBeUndefined()
        // verify alice is not affected
        expect(
            await alice.spaceDapp.isEntitledToSpace(spaceId, alice.walletAddress, Permission.Read),
        ).toBe(true)
        expect(
            await alice.spaceDapp.isEntitledToSpace(spaceId, alice.walletAddress, Permission.Write),
        ).toBe(true)
        // verify bob is not entitled to the space
        expect(
            await bob.spaceDapp.isEntitledToSpace(spaceId, bob.walletAddress, Permission.Read),
        ).toBe(false)
    })
})

function assertRoleEquals(actual: RoleDetails, expected: RoleDetails) {
    expect(actual.name).toEqual(expected.name)
    expect(actual.permissions.length).toEqual(expected.permissions.length)
    expect(actual.permissions).toEqual(expect.arrayContaining(expected.permissions))
    expect(actual.tokens.length).toEqual(expected.tokens.length)
    const actualTokenAddresses = actual.tokens.map((t) => t.contractAddress)
    const expectedTokenAddresses = expected.tokens.map((t) => t.contractAddress)
    expect(actualTokenAddresses).toEqual(expect.arrayContaining(expectedTokenAddresses))
    expect(actual.users.length).toEqual(expected.users.length)
    expect(actual.users).toEqual(expect.arrayContaining(expected.users))
}
