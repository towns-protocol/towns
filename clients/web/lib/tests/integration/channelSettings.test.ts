/**
 * @group casablanca
 */
import {
    createTestSpaceGatedByTownAndZionNfts,
    findRoleByName,
    registerAndStartClients,
} from 'use-zion-client/tests/integration/helpers/TestUtils'

import { RoleIdentifier, RoleEntitlements } from '../../src/types/web3-types'
import { createExternalTokenStruct, Permission } from '@river/web3'

describe('channel settings', () => {
    test('get channel settings', async () => {
        /** Arrange */
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        const channelName = 'test_channel'
        const channelTopic = 'test topic'
        if (!bob.walletAddress) {
            throw new Error('bob.walletAddress is undefined')
        }

        const memberPermissions = [Permission.Read, Permission.Write]

        // create a new test space
        await alice.fundWallet()
        const spaceId = await createTestSpaceGatedByTownAndZionNfts(alice, memberPermissions)
        if (!spaceId) {
            throw new Error('spaceId is undefined')
        }

        const membershipTokenAddress = await alice.spaceDapp.getTownMembershipTokenAddress(
            spaceId.networkId,
        )
        // const testGatingNftAddress = getTestGatingNftAddress(alice.chainId)
        const memberRole: RoleEntitlements = {
            roleId: 3, // dummy
            name: 'Member',
            permissions: memberPermissions,
            tokens: createExternalTokenStruct([membershipTokenAddress]),
            users: [],
        }
        const moderatorRole: RoleEntitlements = {
            roleId: 4, // dummy
            name: 'moderator',
            permissions: [Permission.Read, Permission.Write, Permission.Ban],
            tokens: [],
            users: [bob.walletAddress],
        }
        if (!spaceId) {
            throw new Error('roomId is undefined')
        }
        const memberRoleDetails = await findRoleByName(alice, spaceId.networkId, 'Member')
        if (!memberRoleDetails) {
            throw new Error('memberRoleDetails is null')
        }
        // create a new role
        const moderatorRoleIdentifier: RoleIdentifier | undefined = await alice.createRole(
            spaceId.networkId,
            moderatorRole.name,
            moderatorRole.permissions,
            moderatorRole.tokens,
            moderatorRole.users,
        )
        if (!moderatorRoleIdentifier) {
            throw new Error('moderatorRoleIdentifier is undefined')
        }
        const moderatorRoleId = moderatorRoleIdentifier.roleId
        // create a channel with the roles
        const channelId = await alice.createChannel(
            {
                name: channelName,
                parentSpaceId: spaceId,
                roleIds: [memberRoleDetails.id, moderatorRoleId],
                topic: channelTopic,
            },
            alice.provider.wallet,
        )
        if (!channelId) {
            throw new Error('channelId is undefined')
        }

        /** Act */
        // get the channel settings
        const channelSettings = await alice.spaceDapp.getChannelDetails(
            spaceId.networkId,
            channelId.networkId,
        )

        /** Assert */
        expect(channelSettings).not.toBeNull()
        // verify the channel name, permissions, tokens and users
        if (!channelSettings) {
            throw new Error('channelSettings is null')
        }
        expect(channelSettings.spaceNetworkId).toEqual(spaceId.networkId)
        expect(channelSettings.channelNetworkId).toEqual(channelId.networkId)
        expect(channelSettings.name).toBe(channelName)
        expect(channelSettings.disabled).toBe(false)
        expect(channelSettings.roles.length).toEqual(2)
        for (const role of channelSettings.roles) {
            if (role.name === memberRole.name) {
                assertRole(role, memberRole)
            } else if (role.name === moderatorRole.name) {
                assertRole(role, moderatorRole)
            } else {
                throw new Error(`Unexpected role: ${role.name}`)
            }
        }
    })
})

function assertRole(actualRole: RoleEntitlements, expectedRole: RoleEntitlements) {
    expect(actualRole.name).toBe(expectedRole.name)
    expect(actualRole.permissions.length).toEqual(expectedRole.permissions.length)
    expect(actualRole.permissions).toEqual(expect.arrayContaining(expectedRole.permissions))
    expect(actualRole.users.length).toEqual(expectedRole.users.length)
    expect(actualRole.users).toEqual(expect.arrayContaining(expectedRole.users))
    expect(actualRole.tokens.length).toEqual(expectedRole.tokens.length)
    for (const token of actualRole.tokens) {
        const expectedToken = expectedRole.tokens.find(
            (t) => t.contractAddress === token.contractAddress,
        )
        if (!expectedToken) {
            throw new Error(`Expected token not found: ${token.contractAddress as string}`)
        }
    }
}
