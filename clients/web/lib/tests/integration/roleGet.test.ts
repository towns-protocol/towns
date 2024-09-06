/**
 * @group core
 */
import {
    assertRoleEquals,
    createTestSpaceGatedByTownNft,
    createTestSpaceGatedByTownsNfts,
    findRoleByName,
    registerAndStartClients,
    EVERYONE_ADDRESS,
    createVersionedRuleData,
} from 'use-towns-client/tests/integration/helpers/TestUtils'

import { RoleIdentifier } from '../../src/types/web3-types'
import { TestConstants } from './helpers/TestConstants'
import {
    getTestGatingNftAddress,
    Permission,
    RoleDetails,
    CheckOperationType,
    createOperationsTree,
    NoopRuleData,
} from '@river-build/web3'

describe('get role details', () => {
    test('get details of a role that no channel uses', async () => {
        /** Arrange */
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()
        const roomId = await createTestSpaceGatedByTownsNfts(alice, [Permission.Read])
        if (!roomId) {
            throw new Error('roomId is undefined')
        }
        // create new role in space
        const permissions = [Permission.Ban, Permission.Read, Permission.Write, Permission.Redact]
        const users: string[] = []
        const roleName = 'newRole1'
        const roleId: RoleIdentifier | undefined = await alice.createRole(
            roomId,
            roleName,
            permissions,
            users,
            NoopRuleData,
        )
        if (!roleId) {
            throw new Error('roleId is undefined')
        }

        /** Act */
        const roleDetails = await alice.spaceDapp.getRole(roomId, roleId.roleId)

        /** Assert */
        expect(roleDetails).toBeDefined()
        if (roleDetails) {
            expect(roleDetails.id).toEqual(roleId.roleId)
            expect(roleDetails.name).toEqual(roleName)
            expect(roleDetails.permissions).toEqual(expect.arrayContaining(permissions))
            expect(roleDetails.permissions.length).toEqual(permissions.length)
            expect(roleDetails.users.length).toEqual(0)
            expect(roleDetails.channels.length).toEqual(0)
        }
    })

    test('get details of a role being used by a channel', async () => {
        /** Arrange */
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()
        const roomId = await createTestSpaceGatedByTownsNfts(alice, [Permission.Read])
        if (!roomId) {
            throw new Error('roomId is undefined')
        }
        // create new role in space
        const permissions = [Permission.Ban, Permission.Read, Permission.Write, Permission.Redact]
        const users: string[] = []
        const roleName = 'newRole1'
        const roleIdentifier: RoleIdentifier | undefined = await alice.createRole(
            roomId,
            roleName,
            permissions,
            users,
            NoopRuleData,
        )
        if (!roleIdentifier) {
            throw new Error('roleId is undefined')
        }
        // create a channel with the role
        const channelName = 'test_channel'
        const channel = await alice.createChannel(
            {
                name: channelName,
                parentSpaceId: roomId,
                roles: [roleIdentifier.roleId].map((roleId) => ({
                    roleId,
                    permissions: [],
                })),
            },
            alice.provider.wallet,
        )

        /** Act */
        const roleDetails = await alice.spaceDapp.getRole(roomId, roleIdentifier.roleId)

        /** Assert */
        expect(roleDetails).toBeDefined()
        if (roleDetails) {
            expect(roleDetails.id).toEqual(roleIdentifier.roleId)
            expect(roleDetails.name).toEqual(roleName)
            expect(roleDetails.permissions).toEqual(expect.arrayContaining(permissions))
            expect(roleDetails.permissions.length).toEqual(permissions.length)
            expect(roleDetails.users.length).toEqual(0)
            expect(roleDetails.channels.length).toEqual(1)
            expect(roleDetails.channels[0].channelNetworkId).toEqual(channel)
            expect(roleDetails.channels[0].name).toEqual(channelName)
            expect(roleDetails.channels[0].disabled).toEqual(false)
        }
    })

    test('get details of token member role', async () => {
        /** Arrange */
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()
        const permissions = [Permission.Read, Permission.Write]
        const spaceId = await createTestSpaceGatedByTownsNfts(alice, permissions)
        if (!spaceId) {
            throw new Error('roomId is undefined')
        }

        /** Act */
        // minter role is created with a JoinTown permission, and is gated by any tokens passed in the createTestSpaceGatedByTownsNfts requirements config
        const minterRole = await findRoleByName(alice, spaceId, 'Minter')
        // member role is created with the permissions passed in to createTestSpaceGatedByTownsNfts, and is gated by the membership token
        const memberRole = await findRoleByName(alice, spaceId, 'Member')

        /** Assert */
        const councilNftAddress = await getTestGatingNftAddress(alice.opts.baseChainId)
        if (!councilNftAddress) {
            throw new Error('councilNftAddress is undefined')
        }
        const expectedMinterRole: RoleDetails = {
            id: 1,
            name: 'Minter',
            users: [],
            ruleData: createVersionedRuleData(
                alice,
                createOperationsTree([
                    {
                        address: councilNftAddress,
                        chainId: BigInt(alice.opts.baseChainId),
                        type: CheckOperationType.ERC721,
                    },
                ]),
            ),
            permissions: [Permission.JoinSpace],
            channels: [],
        }
        const expectedMemberRole: RoleDetails = {
            id: 2,
            name: 'Member',
            users: [EVERYONE_ADDRESS], // workaround for now
            ruleData: createVersionedRuleData(alice, NoopRuleData),
            permissions,
            channels: [],
        }
        if (!minterRole) {
            throw new Error('minterRole is undefined')
        }
        if (!memberRole) {
            throw new Error('memberRole is undefined')
        }
        assertRoleEquals(minterRole, expectedMinterRole)
        assertRoleEquals(memberRole, expectedMemberRole)
    })

    test('get details of Everyone role', async () => {
        /** Arrange */
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()
        const permissions = [Permission.Read, Permission.Write]
        const spaceId = await createTestSpaceGatedByTownNft(alice, permissions)

        /** Act */
        // minter role is created with a JoinTown permission, and is not gated by any tokens see createTestSpaceGatedByTownNft
        const minterRole = await findRoleByName(alice, spaceId, 'Minter')
        // everyone is just another member role. member role is created with the permissions passed in to createTestSpaceGatedByTownNft, and is gated by the membership token
        const everyoneRole = await findRoleByName(alice, spaceId, 'Everyone')

        /** Assert */
        if (!minterRole) {
            throw new Error('minterRole is undefined')
        }
        if (!everyoneRole) {
            throw new Error('everyoneRole is undefined')
        }

        const expectedMinterRole: RoleDetails = {
            id: 1,
            name: 'Minter',
            users: [TestConstants.EveryoneAddress],
            ruleData: createVersionedRuleData(alice, NoopRuleData),
            permissions: [Permission.JoinSpace],
            channels: [],
        }
        const expectedEveryoneRole: RoleDetails = {
            id: 2,
            name: 'Everyone',
            users: [EVERYONE_ADDRESS],
            ruleData: createVersionedRuleData(alice, NoopRuleData),
            permissions,
            channels: [],
        }
        assertRoleEquals(minterRole, expectedMinterRole)
        assertRoleEquals(everyoneRole, expectedEveryoneRole)
    })

    test('get details of role with token entitlement', async () => {
        /** Arrange */
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()
        const roomId = await createTestSpaceGatedByTownsNfts(alice, [Permission.Read])
        if (!roomId) {
            throw new Error('roomId is undefined')
        }
        // create new role in space
        const permissions = [Permission.Read, Permission.Write, Permission.Redact]
        const councilNftAddress = await getTestGatingNftAddress(alice.opts.baseChainId)
        if (!councilNftAddress) {
            throw new Error('councilNftAddress is undefined')
        }

        const users: string[] = []
        const roleName = 'newRole1'
        const roleId: RoleIdentifier | undefined = await alice.createRole(
            roomId,
            roleName,
            permissions,
            users,
            NoopRuleData,
        )
        if (!roleId) {
            throw new Error('roleId is undefined')
        }

        /** Act */
        const roleDetails = await alice.spaceDapp.getRole(roomId, roleId.roleId)

        /** Assert */
        expect(roleDetails).toBeDefined()
        if (roleDetails) {
            expect(roleDetails.id).toEqual(roleId.roleId)
        }
    })

    test('get details of role with user entitlement', async () => {
        /** Arrange */
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()
        const roomId = await createTestSpaceGatedByTownsNfts(alice, [Permission.Read])
        if (!roomId) {
            throw new Error('roomId is undefined')
        }
        // create new role in space
        const permissions = [Permission.Read, Permission.Write]

        const mod1 = await TestConstants.getWalletWithTestGatingNft()
        const mod2 = await TestConstants.getWalletWithTestGatingNft()
        const users: string[] = [mod1.address, mod2.address]
        const roleName = 'newRole1'
        const roleId: RoleIdentifier | undefined = await alice.createRole(
            roomId,
            roleName,
            permissions,
            users,
            NoopRuleData,
        )
        if (!roleId) {
            throw new Error('roleId is undefined')
        }

        /** Act */
        const roleDetails = await alice.spaceDapp.getRole(roomId, roleId.roleId)

        /** Assert */
        expect(roleDetails).toBeDefined()
        if (roleDetails) {
            expect(roleDetails.id).toEqual(roleId.roleId)
            expect(roleDetails.users.length).toEqual(2)
            expect(roleDetails.users).toEqual(expect.arrayContaining(users))
        }
    })
})
