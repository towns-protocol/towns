import { Permission, RoleDetails } from 'use-zion-client/src/client/web3/ContractTypes'
import {
    createExternalTokenStruct,
    getFilteredRolesFromSpace,
    getZioneerNftAddress,
} from '../../src/client/web3/ContractHelpers'
import {
    createTestSpaceWithEveryoneRole,
    createTestSpaceWithZionMemberRole,
    registerAndStartClients,
} from 'use-zion-client/tests/integration/helpers/TestUtils'

import { ContractReceipt } from 'ethers'
import { TokenDataTypes } from '../../src/client/web3/shims/TokenEntitlementShim'

describe('update role', () => {
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
