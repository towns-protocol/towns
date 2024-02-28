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

import { BigNumber } from 'ethers'
import { RoleIdentifier } from '../../src/types/web3-types'
import { TestConstants } from './helpers/TestConstants'
import {
    createExternalTokenStruct,
    getTestGatingNftAddress,
    Permission,
    RoleDetails,
    TokenEntitlementDataTypes,
    getContractsInfo,
} from '@river/web3'

describe('get role details', () => {
    test('get details of a role that no channel uses', async () => {
        /** Arrange */
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()
        const roomId = await createTestSpaceGatedByTownAndZionNfts(alice, [Permission.Read])
        if (!roomId) {
            throw new Error('roomId is undefined')
        }
        // create new role in space
        const permissions = [Permission.Ban, Permission.Read, Permission.Write, Permission.Redact]
        const tokens: TokenEntitlementDataTypes.ExternalTokenStruct[] = []
        const users: string[] = []
        const roleName = 'newRole1'
        const roleId: RoleIdentifier | undefined = await alice.createRole(
            roomId,
            roleName,
            permissions,
            tokens,
            users,
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
            expect(roleDetails.tokens.length).toEqual(0)
            expect(roleDetails.users.length).toEqual(0)
            expect(roleDetails.channels.length).toEqual(0)
        }
    })

    test('get details of a role being used by a channel', async () => {
        /** Arrange */
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()
        const roomId = await createTestSpaceGatedByTownAndZionNfts(alice, [Permission.Read])
        if (!roomId) {
            throw new Error('roomId is undefined')
        }
        // create new role in space
        const permissions = [Permission.Ban, Permission.Read, Permission.Write, Permission.Redact]
        const tokens: TokenEntitlementDataTypes.ExternalTokenStruct[] = []
        const users: string[] = []
        const roleName = 'newRole1'
        const roleIdentifier: RoleIdentifier | undefined = await alice.createRole(
            roomId,
            roleName,
            permissions,
            tokens,
            users,
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
                roleIds: [roleIdentifier.roleId],
            },
            alice.provider.wallet,
        )
        if (!channel) {
            throw new Error('channel is undefined')
        }

        /** Act */
        const roleDetails = await alice.spaceDapp.getRole(roomId, roleIdentifier.roleId)

        /** Assert */
        expect(roleDetails).toBeDefined()
        if (roleDetails) {
            expect(roleDetails.id).toEqual(roleIdentifier.roleId)
            expect(roleDetails.name).toEqual(roleName)
            expect(roleDetails.permissions).toEqual(expect.arrayContaining(permissions))
            expect(roleDetails.permissions.length).toEqual(permissions.length)
            expect(roleDetails.tokens.length).toEqual(0)
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
        const spaceId = await createTestSpaceGatedByTownAndZionNfts(alice, permissions)
        if (!spaceId) {
            throw new Error('roomId is undefined')
        }

        /** Act */
        // minter role is created with a JoinTown permission, and is gated by any tokens passed in the createTestSpaceGatedByTownAndZionNfts requirements config
        const minterRole = await findRoleByName(alice, spaceId, 'Minter')
        // member role is created with the permissions passed in to createTestSpaceGatedByTownAndZionNfts, and is gated by the membership token
        const memberRole = await findRoleByName(alice, spaceId, 'Member')

        /** Assert */
        const membershipTokenAddress = await alice.spaceDapp.getTownMembershipTokenAddress(spaceId)
        const councilNftAddress = await getTestGatingNftAddress(alice.chainId)
        if (!councilNftAddress) {
            throw new Error('councilNftAddress is undefined')
        }
        const expectedMinterTokens = createExternalTokenStruct([councilNftAddress])[0]
        const expectedMemberToken = createExternalTokenStruct([membershipTokenAddress])[0]
        const expectedMinterRole: RoleDetails = {
            id: 1,
            name: 'Minter',
            tokens: [expectedMinterTokens],
            users: [],
            permissions: [Permission.JoinSpace],
            channels: [],
        }
        const expectedMemberRole: RoleDetails = {
            id: 2,
            name: 'Member',
            tokens: [expectedMemberToken],
            users: [],
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
        if (!spaceId) {
            throw new Error('roomId is undefined')
        }

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
        const membershipTokenAddress = await alice.spaceDapp.getTownMembershipTokenAddress(spaceId)
        const expectedMemberToken = createExternalTokenStruct([membershipTokenAddress])[0]

        const expectedMinterRole: RoleDetails = {
            id: 1,
            name: 'Minter',
            tokens: [],
            users: [TestConstants.EveryoneAddress],
            permissions: [Permission.JoinSpace],
            channels: [],
        }
        const expectedEveryoneRole: RoleDetails = {
            id: 2,
            name: 'Everyone',
            tokens: [expectedMemberToken],
            users: [],
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
        const roomId = await createTestSpaceGatedByTownAndZionNfts(alice, [Permission.Read])
        if (!roomId) {
            throw new Error('roomId is undefined')
        }
        // create new role in space
        const permissions = [Permission.Read, Permission.Write, Permission.Redact]
        const councilNftAddress = await getTestGatingNftAddress(alice.chainId)
        if (!councilNftAddress) {
            throw new Error('councilNftAddress is undefined')
        }
        const mockNFTAddress = getContractsInfo(alice.chainId).mockErc721aAddress
        const tokens = createExternalTokenStruct([councilNftAddress, mockNFTAddress])
        const expectedCouncilToken = tokens[0]
        const expectedZioneerToken = tokens[1]
        const users: string[] = []
        const roleName = 'newRole1'
        const roleId: RoleIdentifier | undefined = await alice.createRole(
            roomId,
            roleName,
            permissions,
            tokens,
            users,
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
            expect(roleDetails.tokens.length).toEqual(2)
            expect(roleDetails.tokens[0].contractAddress).toEqual(
                await expectedCouncilToken.contractAddress,
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

    test('get details of role with user entitlement', async () => {
        /** Arrange */
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()
        const roomId = await createTestSpaceGatedByTownAndZionNfts(alice, [Permission.Read])
        if (!roomId) {
            throw new Error('roomId is undefined')
        }
        // create new role in space
        const permissions = [Permission.Read, Permission.Write]
        const tokens: TokenEntitlementDataTypes.ExternalTokenStruct[] = []

        const mod1 = await TestConstants.getWalletWithTestGatingNft()
        const mod2 = await TestConstants.getWalletWithTestGatingNft()
        const users: string[] = [mod1.address, mod2.address]
        const roleName = 'newRole1'
        const roleId: RoleIdentifier | undefined = await alice.createRole(
            roomId,
            roleName,
            permissions,
            tokens,
            users,
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
