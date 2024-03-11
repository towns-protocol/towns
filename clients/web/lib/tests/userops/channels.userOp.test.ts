import { NoopRuleData, Permission } from '@river/web3'
import { registerAndStartClient } from '../integration/helpers/TestUtils'
import {
    createUngatedSpace,
    generateRandomUnfundedOrPrivateKeyWallet,
    getAccountAbstractionConfig,
} from './testUtils'
import { Address } from '../../src/types/web3-types'

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
    const alice = await registerAndStartClient(
        'alice',
        generateRandomUnfundedOrPrivateKeyWallet(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
        {
            accountAbstractionConfig,
        },
    )

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
        // users
        [],
        // tokens
        NoopRuleData,
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

test("can create a channel when role is gated by user's smart account", async () => {
    const alice = await registerAndStartClient(
        'alice',
        generateRandomUnfundedOrPrivateKeyWallet(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
        {
            accountAbstractionConfig,
        },
    )

    const bob = await registerAndStartClient(
        'bob',
        generateRandomUnfundedOrPrivateKeyWallet(process.env.PRIVY_WALLET_PRIVATE_KEY_2),
        {
            accountAbstractionConfig,
        },
    )

    const spaceId = await createUngatedSpace(alice, [Permission.Read, Permission.Write])

    expect(alice.getRoomMember(spaceId!, alice.getUserId()!)).toBeTruthy()

    const room = await bob.joinTown(spaceId!, bob.wallet)
    expect(room.members.map((m) => m.userId).includes(bob.getUserId()!)).toBeTruthy()

    const bobsSmartAccount = await bob.getAbstractAccountAddress({
        rootKeyAddress: bob.wallet.address as Address,
    })

    if (!bobsSmartAccount) {
        throw new Error('bobsSmartAccount not found')
    }

    // gate the role by bob's smart account
    const createRoleTx = await alice.createRole(
        spaceId!,
        'new_role',
        [Permission.Read, Permission.Write, Permission.AddRemoveChannels],
        [bobsSmartAccount],
        NoopRuleData,
    )

    expect(createRoleTx).toBeDefined()
    const createdRole = await alice.spaceDapp.getRole(spaceId!, 3)
    expect(createdRole?.permissions).toContain(Permission.AddRemoveChannels)

    const channel = await bob.createChannel(
        {
            name: 'test_channel',
            parentSpaceId: spaceId!,
            roleIds: [2],
        },
        bob.provider.wallet,
    )

    expect(channel).toBeDefined()
})
