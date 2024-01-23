import { Permission } from '@river/web3'
import { TestConstants } from '../integration/helpers/TestConstants'
import { registerAndStartClient } from '../integration/helpers/TestUtils'
import { createUngatedSpace, getAccountAbstractionConfig } from './testUtils'

/**
 *
 * // https://www.npmjs.com/package/jest-runner-groups
 * @group integration/userops
 */

const accountAbstractionConfig = getAccountAbstractionConfig()
const TEST_CHANNEL_NAME = 'test_channel'
const NEW_ROLE_NAME = 'new_role_name'
const NEW_CHANNEL_NAME = 'new_channel_name'

test('can create and update channel with user ops', async () => {
    const alice = await registerAndStartClient('alice', TestConstants.getUnfundedWallet(), {
        accountAbstractionConfig,
    })

    // send a user op that creates a space and links AA wallet so entitlement passes
    const spaceId = await createUngatedSpace(alice, [Permission.Read, Permission.Write])

    let channelId: string | undefined
    if (spaceId) {
        // create a channel on-chain with no roles
        channelId = await alice.createChannel(
            {
                name: TEST_CHANNEL_NAME,
                parentSpaceId: spaceId,
                roleIds: [],
            },
            alice.provider.wallet,
        )
    }

    expect(channelId).toBeDefined()

    const newRoleId = await alice.createRole(
        spaceId!,
        NEW_ROLE_NAME,
        // permissions
        [Permission.Read],
        // tokens
        [],
        // users
        [],
    )

    expect(newRoleId).toBeDefined()

    // new role + default roles (member/minter)
    expect(await alice.spaceDapp.getRoles(spaceId!)).toHaveLength(3)

    const channelDetailsFirstCheck = await alice.spaceDapp.getChannelDetails(spaceId!, channelId!)
    expect(channelDetailsFirstCheck?.name).toBe(TEST_CHANNEL_NAME)
    expect(channelDetailsFirstCheck?.roles).toHaveLength(0)

    const txContext = await alice.updateChannelTransaction(
        {
            parentSpaceId: spaceId!,
            channelId: channelId!,
            updatedChannelName: NEW_CHANNEL_NAME,
            updatedRoleIds: [newRoleId!.roleId],
        },
        alice.provider.wallet,
    )
    await alice.waitForUpdateChannelTransaction(txContext)

    const channelDetailsSecondCheck = await alice.spaceDapp.getChannelDetails(spaceId!, channelId!)
    expect(channelDetailsSecondCheck?.name).toBe(NEW_CHANNEL_NAME)
    expect(channelDetailsSecondCheck?.roles).toHaveLength(1)
    expect(channelDetailsSecondCheck?.roles.find((r) => r.name === NEW_ROLE_NAME)).toBeDefined()
})
