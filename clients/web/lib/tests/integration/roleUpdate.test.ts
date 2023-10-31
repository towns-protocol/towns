/**
 * @group casablanca
 */
import {
    assertRoleEquals,
    createTestSpaceGatedByTownNft,
    createTestSpaceGatedByTownAndZionNfts,
    findRoleByName,
    registerAndStartClients,
} from 'use-zion-client/tests/integration/helpers/TestUtils'
import { ContractReceipt } from 'ethers'
import { TestConstants } from './helpers/TestConstants'
import {
    getFilteredRolesFromSpace,
    Permission,
    TokenEntitlementDataTypes,
    createExternalTokenStruct,
    getPioneerNftAddress,
    RoleDetails,
} from '@river/web3'

describe('update role', () => {
    test('Update Everyone role with multicall', async () => {
        /** Arrange */
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()
        const roomId = await createTestSpaceGatedByTownNft(alice, [Permission.Ban])
        if (!roomId) {
            throw new Error('roomId is undefined')
        }
        // get current role details
        const spaceNetworkId = roomId.networkId
        const roles = await getFilteredRolesFromSpace(alice.spaceDapp, spaceNetworkId)
        const roleDetails = await findRoleByName(alice, spaceNetworkId, 'Everyone', roles)
        if (!roleDetails) {
            throw new Error('roleDetails is undefined')
        }

        /** Act */
        // change the role details
        const newRoleName = 'newRoleName'
        const newPermissions = [Permission.Read, Permission.Write, Permission.Redact]
        const transaction = await alice.spaceDapp.updateRole(
            {
                spaceNetworkId: spaceNetworkId,
                roleId: roleDetails.id,
                roleName: newRoleName,
                permissions: newPermissions,
                tokens: roleDetails.tokens,
                users: roleDetails.users,
            },
            alice.provider.wallet,
        )
        const receipt = await transaction.wait()

        /** Assert */
        expect(receipt?.status).toEqual(1)
        const actual = await alice.spaceDapp.getRole(spaceNetworkId, roleDetails.id)
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
        const roomId = await createTestSpaceGatedByTownAndZionNfts(alice, [Permission.Ban])
        if (!roomId) {
            throw new Error('roomId is undefined')
        }
        // get current role details
        const spaceNetworkId = roomId.networkId
        const roles = await getFilteredRolesFromSpace(alice.spaceDapp, spaceNetworkId)
        const roleDetails = await findRoleByName(alice, spaceNetworkId, 'Member', roles)
        if (!roleDetails) {
            throw new Error('roleDetails is undefined')
        }

        /** Act */
        // change the role details
        const newRoleName = 'newRoleName'
        const newPermissions = [Permission.Read, Permission.Write, Permission.Redact]
        const pioneerNftAddress = getPioneerNftAddress(alice.chainId)
        // test space was created with council token. replace with zioneer token
        const newTokens = createExternalTokenStruct([pioneerNftAddress])
        const transaction = await alice.spaceDapp.updateRole(
            {
                spaceNetworkId: spaceNetworkId,
                roleId: roleDetails.id,
                roleName: newRoleName,
                permissions: newPermissions,
                tokens: newTokens,
                users: roleDetails.users,
            },
            alice.provider.wallet,
        )
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
        const actual = await alice.spaceDapp.getRole(spaceNetworkId, roleDetails.id)
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

    test('Add a moderator to the role', async () => {
        /** Arrange */
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()
        const roomId = await createTestSpaceGatedByTownAndZionNfts(alice, [
            Permission.Read,
            Permission.Write,
        ])
        if (!roomId) {
            throw new Error('roomId is undefined')
        }
        // create a new role
        const moderatorPermissions = [Permission.Read, Permission.Write, Permission.Ban]
        const moderatorTokens: TokenEntitlementDataTypes.ExternalTokenStruct[] = []
        // replace the current moderator with this user
        const mod1 = await TestConstants.getWalletWithMemberNft()
        const moderatorUsers: string[] = [mod1.address]
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
        let roles = await getFilteredRolesFromSpace(alice.spaceDapp, spaceNetworkId)
        const expectedMemberRole = await findRoleByName(alice, spaceNetworkId, 'Member', roles)
        if (!expectedMemberRole) {
            throw new Error('expectedMemberRole is undefined')
        }

        /** Act */
        // add a moderator
        const mod2 = await TestConstants.getWalletWithMemberNft()
        const newModeratorUsers = [...moderatorUsers, mod2.address]
        const newModeratorRole: RoleDetails = {
            id: moderatorRoleId.roleId,
            name: moderatorRoleName,
            permissions: moderatorPermissions,
            tokens: moderatorTokens,
            users: newModeratorUsers,
            channels: [],
        }
        let receipt: ContractReceipt | undefined
        try {
            const transaction = await alice.spaceDapp.updateRole(
                {
                    spaceNetworkId: spaceNetworkId,
                    roleId: newModeratorRole.id,
                    roleName: newModeratorRole.name,
                    permissions: newModeratorRole.permissions,
                    tokens: newModeratorRole.tokens,
                    users: newModeratorRole.users,
                },
                alice.provider.wallet,
            )

            receipt = await transaction.wait()
        } catch (e) {
            const error = await alice.spaceDapp.parseSpaceError(spaceNetworkId, e)
            console.error(error)
            // fail the test.
            throw e
        }

        /** Assert */
        expect(receipt?.status).toEqual(1)
        roles = await getFilteredRolesFromSpace(alice.spaceDapp, spaceNetworkId)
        for (const role of roles) {
            const actual = await alice.spaceDapp.getRole(spaceNetworkId, role.roleId)
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
                } else if (role.name === 'Minter') {
                    // ignore it
                    // this is a role that is created by default with every space
                } else {
                    throw new Error(`Unexpected role name: ${role.name}`)
                }
            }
        }
    })

    test('Replace a moderator in the role', async () => {
        /** Arrange */
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()
        const roomId = await createTestSpaceGatedByTownAndZionNfts(alice, [
            Permission.Read,
            Permission.Write,
        ])
        if (!roomId) {
            throw new Error('roomId is undefined')
        }
        // create a new role
        const moderatorPermissions = [Permission.Read, Permission.Write, Permission.Ban]
        const moderatorTokens: TokenEntitlementDataTypes.ExternalTokenStruct[] = []
        // replace the current moderator with this user
        const mod1 = await TestConstants.getWalletWithMemberNft()
        const moderatorUsers: string[] = [mod1.address]
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
        let roles = await getFilteredRolesFromSpace(alice.spaceDapp, spaceNetworkId)
        const expectedMemberRole = await findRoleByName(alice, spaceNetworkId, 'Member', roles)
        if (!expectedMemberRole) {
            throw new Error('expectedMemberRole is undefined')
        }

        /** Act */
        // add a moderator
        const mod2 = await TestConstants.getWalletWithMemberNft()
        const newModeratorUsers = [mod2.address]
        const newModeratorRole: RoleDetails = {
            id: moderatorRoleId.roleId,
            name: moderatorRoleName,
            permissions: moderatorPermissions,
            tokens: moderatorTokens,
            users: newModeratorUsers,
            channels: [],
        }
        let receipt: ContractReceipt | undefined
        try {
            const transaction = await alice.spaceDapp.updateRole(
                {
                    spaceNetworkId: spaceNetworkId,
                    roleId: newModeratorRole.id,
                    roleName: newModeratorRole.name,
                    permissions: newModeratorRole.permissions,
                    tokens: newModeratorRole.tokens,
                    users: newModeratorRole.users,
                },
                alice.provider.wallet,
            )

            receipt = await transaction.wait()
        } catch (e) {
            const error = await alice.spaceDapp.parseSpaceError(spaceNetworkId, e)
            console.error(error)
            // fail the test.
            throw e
        }

        /** Assert */
        expect(receipt?.status).toEqual(1)
        roles = await getFilteredRolesFromSpace(alice.spaceDapp, spaceNetworkId)
        for (const role of roles) {
            const actual = await alice.spaceDapp.getRole(spaceNetworkId, role.roleId)
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
                } else if (role.name === 'Minter') {
                    // ignore it
                    // this is a role that is created by default with every space
                } else {
                    throw new Error(`Unexpected role name: ${role.name}`)
                }
            }
        }
    })
})
