/**
 * @group core
 */
import {
    EVERYONE_ADDRESS,
    createTestSpaceGatedByTownsNfts,
    findRoleByName,
    registerAndStartClients,
} from 'use-towns-client/tests/integration/helpers/TestUtils'

import { RoleIdentifier, RoleEntitlements, Address } from '../../src/types/web3-types'
import {
    CheckOperationType,
    LOCALHOST_CHAIN_ID,
    NoopRuleData,
    Permission,
    createOperationsTree,
} from '@river-build/web3'

// TODO: this test uses createTestSpaceGatedByTownNfts. skipping for now b/c createTestSpaceGatedByTownNfts needs more xchain work
// https://linear.app/hnt-labs/issue/HNT-5149/fix-channelsettingstest-and-joinchanneltest
describe.skip('channel settings', () => {
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
        const spaceId = await createTestSpaceGatedByTownsNfts(alice, memberPermissions)
        if (!spaceId) {
            throw new Error('spaceId is undefined')
        }

        const moderatorRole: RoleEntitlements = {
            roleId: 4, // dummy
            name: 'moderator',
            permissions: [Permission.Read, Permission.Write, Permission.Ban],
            ruleData: NoopRuleData,
            users: [bob.walletAddress],
        }
        if (!spaceId) {
            throw new Error('roomId is undefined')
        }
        const memberRoleDetails = await findRoleByName(alice, spaceId, 'Member')
        if (!memberRoleDetails) {
            throw new Error('memberRoleDetails is null')
        }
        // create a new role
        const moderatorRoleIdentifier: RoleIdentifier | undefined = await alice.createRole(
            spaceId,
            moderatorRole.name,
            moderatorRole.permissions,
            moderatorRole.users,
            moderatorRole.ruleData,
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
        const channelSettings = await alice.spaceDapp.getChannelDetails(spaceId, channelId)

        /** Assert */
        expect(channelSettings).not.toBeNull()
        // verify the channel name, permissions, tokens and users
        if (!channelSettings) {
            throw new Error('channelSettings is null')
        }
        expect(channelSettings.spaceNetworkId).toEqual(spaceId)
        expect(channelSettings.channelNetworkId).toEqual(channelId)
        expect(channelSettings.name).toBe(channelName)
        expect(channelSettings.disabled).toBe(false)
        expect(channelSettings.roles.length).toEqual(2)

        const membershipTokenAddress = (await alice.spaceDapp.getSpaceMembershipTokenAddress(
            spaceId,
        )) as Address

        for (const role of channelSettings.roles) {
            if (role.name === 'Member') {
                assertRole(role, {
                    roleId: 3, // dummy
                    name: 'Member',
                    permissions: memberPermissions,
                    users: [EVERYONE_ADDRESS],
                    ruleData: createOperationsTree([
                        {
                            address: membershipTokenAddress,
                            chainId: BigInt(LOCALHOST_CHAIN_ID),
                            type: CheckOperationType.ERC721,
                        },
                    ]),
                })
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

    expect(actualRole.ruleData.operations.length).toEqual(expectedRole.ruleData.operations.length)
    for (const token of actualRole.ruleData.checkOperations) {
        const expectedToken = expectedRole.ruleData.checkOperations.find(
            (t) => t.contractAddress === token.contractAddress,
        )
        if (!expectedToken) {
            throw new Error(`Expected token not found: ${token.contractAddress as string}`)
        }
    }
}
