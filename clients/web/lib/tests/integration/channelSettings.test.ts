/**
 * @group core
 */
import {
    EVERYONE_ADDRESS,
    createTestSpaceGatedByTownsNfts,
    findRoleByName,
    getRuleDataV2,
    registerAndStartClients,
    createVersionedRuleData,
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
        const spaceId = await createTestSpaceGatedByTownsNfts(alice, memberPermissions)
        if (!spaceId) {
            throw new Error('spaceId is undefined')
        }

        const moderatorRole: RoleEntitlements = {
            roleId: 4, // dummy
            name: 'moderator',
            permissions: [Permission.Read, Permission.Write, Permission.ModifyBanning],
            ruleData: {
                kind: 'v2',
                rules: NoopRuleData,
            },
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
            getRuleDataV2(moderatorRole.ruleData),
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
                roles: [memberRoleDetails.id, moderatorRoleId].map((roleId) => ({
                    roleId,
                    permissions: [],
                })),
                topic: channelTopic,
            },
            alice.provider.wallet,
        )

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
            if (role.name === 'Minter') {
                assertRolesEqual(role, {
                    roleId: 0, // dummy
                    name: 'Minter',
                    permissions: memberPermissions,
                    users: [],
                    ruleData: createVersionedRuleData(
                        alice,
                        createOperationsTree([
                            {
                                address: membershipTokenAddress,
                                chainId: BigInt(LOCALHOST_CHAIN_ID),
                                type: CheckOperationType.ERC721,
                            },
                        ]),
                    ),
                })
            } else if (role.name === 'Member') {
                assertRolesEqual(role, {
                    roleId: 1, // dummy
                    name: 'Member',
                    permissions: memberPermissions,
                    users: [EVERYONE_ADDRESS],
                    ruleData: createVersionedRuleData(alice, NoopRuleData),
                })
            } else if (role.name === moderatorRole.name) {
                assertRolesEqual(role, moderatorRole)
            } else {
                throw new Error(`Unexpected role: ${role.name}`)
            }
        }
    })
})

function assertRolesEqual(actualRole: RoleEntitlements, expectedRole: RoleEntitlements) {
    expect(actualRole.name).toBe(expectedRole.name)
    expect(actualRole.permissions.length).toEqual(expectedRole.permissions.length)
    expect(actualRole.permissions).toEqual(expect.arrayContaining(expectedRole.permissions))
    expect(actualRole.users.length).toEqual(expectedRole.users.length)
    expect(actualRole.users).toEqual(expect.arrayContaining(expectedRole.users))

    const actualRuleData = actualRole.ruleData.rules
    const expectedRuleData = expectedRole.ruleData.rules
    expect(actualRuleData.operations.length).toEqual(expectedRuleData.operations.length)
    for (const token of actualRuleData.checkOperations) {
        const expectedToken = expectedRuleData.checkOperations.find(
            (t) => t.contractAddress === token.contractAddress,
        )
        if (!expectedToken) {
            throw new Error(`Expected token not found: ${token.contractAddress as string}`)
        }
    }
}
