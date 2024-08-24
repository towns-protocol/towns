/**
 * @group core
 */
import {
    assertRoleEquals,
    createTestSpaceGatedByTownNft,
    createTestSpaceGatedByTownsNfts,
    findRoleByName,
    registerAndStartClients,
    createVersionedRuleData,
} from 'use-towns-client/tests/integration/helpers/TestUtils'
import { TestConstants } from './helpers/TestConstants'
import { RoleDetails } from '../../src/types/web3-types'
import { getFilteredRolesFromSpace, Permission, NoopRuleData } from '@river-build/web3'

describe('update role', () => {
    test('Update Everyone role with multicall', async () => {
        /** Arrange */
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()
        const roomId = await createTestSpaceGatedByTownNft(alice, [Permission.Ban])

        // get current role details
        const spaceNetworkId = roomId
        const roles = await getFilteredRolesFromSpace(alice.spaceDapp, spaceNetworkId)
        const roleDetails = await findRoleByName(alice, spaceNetworkId, 'Everyone', roles)
        if (!roleDetails) {
            throw new Error('roleDetails is undefined')
        }

        /** Act */
        // change the role details
        const newRoleName = 'newRoleName'
        const newPermissions = [Permission.Read, Permission.Write, Permission.Redact]
        const transaction = await alice.updateRoleTransaction(
            spaceNetworkId,
            roleDetails.id,
            newRoleName,
            newPermissions,
            roleDetails.users,
            NoopRuleData,
            alice.provider.wallet,
        )
        const receipt = await alice.waitForUpdateRoleTransaction(transaction)

        /** Assert */
        expect(receipt?.status).toEqual('Success')
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
        const roomId = await createTestSpaceGatedByTownsNfts(alice, [Permission.Ban])
        if (!roomId) {
            throw new Error('roomId is undefined')
        }
        // get current role details
        const spaceNetworkId = roomId
        const roles = await getFilteredRolesFromSpace(alice.spaceDapp, spaceNetworkId)
        const roleDetails = await findRoleByName(alice, spaceNetworkId, 'Member', roles)
        if (!roleDetails) {
            throw new Error('roleDetails is undefined')
        }

        /** Act */
        // change the role details
        const newRoleName = 'newRoleName'
        const newPermissions = [Permission.Read, Permission.Write, Permission.Redact]

        const transaction = await alice.updateRoleTransaction(
            spaceNetworkId,
            roleDetails.id,
            newRoleName,
            newPermissions,
            roleDetails.users,
            NoopRuleData,
            alice.provider.wallet,
        )
        const receipt = await alice.waitForUpdateRoleTransaction(transaction)

        /** Assert */
        expect(receipt?.status).toEqual('Success')
        const actual = await alice.spaceDapp.getRole(spaceNetworkId, roleDetails.id)
        if (actual) {
            expect(actual.name).toEqual(newRoleName)
            expect(actual.permissions.length).toEqual(newPermissions.length)
            expect(actual.permissions).toEqual(expect.arrayContaining(newPermissions))
        }
    })

    test('Add a moderator to the role', async () => {
        /** Arrange */
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()
        const roomId = await createTestSpaceGatedByTownsNfts(alice, [
            Permission.Read,
            Permission.Write,
        ])
        if (!roomId) {
            throw new Error('roomId is undefined')
        }
        // create a new role
        const moderatorPermissions = [Permission.Read, Permission.Write, Permission.Ban]
        // replace the current moderator with this user
        const mod1 = await TestConstants.getWalletWithTestGatingNft()
        const moderatorUsers: string[] = [mod1.address]
        const moderatorRoleName = 'Moderator'
        const txn = await alice.createRoleTransaction(
            roomId,
            moderatorRoleName,
            moderatorPermissions,
            moderatorUsers,
            NoopRuleData,
            alice.provider.wallet,
        )
        const ctx = await alice.waitForCreateRoleTransaction(txn)
        expect(ctx.status).toEqual('Success')
        const moderatorRoleId = ctx.data?.roleId
        if (!moderatorRoleId) {
            throw new Error('moderatorRoleId is undefined')
        }
        // get current role details for the Moderator role and the Member role
        const spaceNetworkId = roomId
        let roles = await getFilteredRolesFromSpace(alice.spaceDapp, spaceNetworkId)
        const expectedMemberRole = await findRoleByName(alice, spaceNetworkId, 'Member', roles)
        if (!expectedMemberRole) {
            throw new Error('expectedMemberRole is undefined')
        }

        /** Act */
        // add a moderator
        const mod2 = await TestConstants.getWalletWithTestGatingNft()
        const newModeratorUsers = [...moderatorUsers, mod2.address]
        const newModeratorRole: RoleDetails = {
            id: moderatorRoleId.roleId,
            name: moderatorRoleName,
            permissions: moderatorPermissions,
            users: newModeratorUsers,
            ruleData: createVersionedRuleData(alice, NoopRuleData),
            channels: [],
        }
        const transaction = await alice.updateRoleTransaction(
            spaceNetworkId,
            newModeratorRole.id,
            newModeratorRole.name,
            newModeratorRole.permissions,
            newModeratorRole.users,
            NoopRuleData,
            alice.provider.wallet,
        )
        const receipt = await alice.waitForUpdateRoleTransaction(transaction)

        /** Assert */
        expect(receipt?.status).toEqual('Success')
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
        const roomId = await createTestSpaceGatedByTownsNfts(alice, [
            Permission.Read,
            Permission.Write,
        ])
        if (!roomId) {
            throw new Error('roomId is undefined')
        }
        console.log('roomId', roomId)
        // create a new role
        const moderatorPermissions = [Permission.Read, Permission.Write, Permission.Ban]
        // replace the current moderator with this user
        const mod1 = await TestConstants.getWalletWithTestGatingNft()
        const moderatorUsers: string[] = [mod1.address]
        const moderatorRoleName = 'Moderator'
        const txn = await alice.createRoleTransaction(
            roomId,
            moderatorRoleName,
            moderatorPermissions,
            moderatorUsers,
            NoopRuleData,
            alice.provider.wallet,
        )
        const ctx = await alice.waitForCreateRoleTransaction(txn)
        expect(ctx.status).toEqual('Success')

        const moderatorRoleId = ctx.data?.roleId?.roleId
        expect(moderatorRoleId).toBeDefined()

        console.log('createRole created', moderatorRoleId)
        // get current role details for the Moderator role and the Member role
        const spaceNetworkId = roomId
        let roles = await getFilteredRolesFromSpace(alice.spaceDapp, spaceNetworkId)
        const expectedMemberRole = await findRoleByName(alice, spaceNetworkId, 'Member', roles)
        if (!expectedMemberRole) {
            throw new Error('expectedMemberRole is undefined')
        }

        /** Act */
        // add a moderator
        const mod2 = await TestConstants.getWalletWithTestGatingNft()
        const newModeratorUsers = [mod2.address]
        const newModeratorRole: RoleDetails = {
            id: moderatorRoleId!,
            name: moderatorRoleName,
            permissions: moderatorPermissions,
            users: newModeratorUsers,
            ruleData: createVersionedRuleData(alice, NoopRuleData),
            channels: [],
        }
        const transaction = await alice.updateRoleTransaction(
            spaceNetworkId,
            newModeratorRole.id,
            newModeratorRole.name,
            newModeratorRole.permissions,
            newModeratorRole.users,
            NoopRuleData,
            alice.provider.wallet,
        )
        const receipt = await alice.waitForUpdateRoleTransaction(transaction)

        /** Assert */
        expect(receipt?.status).toEqual('Success')
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
