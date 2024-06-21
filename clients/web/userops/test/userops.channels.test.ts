import { Address, LocalhostWeb3Provider, NoopRuleData } from '@river-build/web3'
import { Permission } from '@river-build/web3'
import {
    createSpaceDappAndUserops,
    createUngatedSpace,
    generatePrivyWalletIfKey,
    getSpaceId,
    sleepBetweenTxs,
    waitForOpAndTx,
} from './utils'
import { makeUniqueChannelStreamId } from '@river-build/sdk'

const TEST_CHANNEL_NAME = 'test_channel'
const NEW_ROLE_NAME = 'new_role_name'
const NEW_CHANNEL_NAME = 'new_channel_name'

test('can create and update channel', async () => {
    const alice = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
    )
    await alice.ready

    const { spaceDapp, userOps } = createSpaceDappAndUserops(alice)

    const createSpaceOp = await createUngatedSpace({
        userOps,
        spaceDapp,
        signer: alice.wallet,
        rolePermissions: [Permission.Read, Permission.Write],
    })
    const txReceipt = await waitForOpAndTx(createSpaceOp, alice)
    await sleepBetweenTxs()

    const spaceId = await getSpaceId(spaceDapp, txReceipt)

    // create a channel
    const createChannelOp = await userOps.sendCreateChannelOp([
        spaceId,
        TEST_CHANNEL_NAME,
        'channel description',
        makeUniqueChannelStreamId(spaceId),
        // roleIds
        [],
        alice.wallet,
    ])
    await waitForOpAndTx(createChannelOp, alice)
    await sleepBetweenTxs()

    const channels = await spaceDapp.getChannels(spaceId)

    const createdChannel = channels.find((c) => c.name === TEST_CHANNEL_NAME)
    expect(createdChannel).toBeDefined()

    // create a role
    const createRoleOp = await userOps.sendCreateRoleOp([
        spaceId,
        NEW_ROLE_NAME,
        [Permission.Read],
        [],
        NoopRuleData,
        alice.wallet,
    ])

    await waitForOpAndTx(createRoleOp, alice)
    await sleepBetweenTxs()

    const roles = await spaceDapp.getRoles(spaceId)
    // new role + default roles (member/minter)
    expect(roles).toHaveLength(3)
    const newRole = roles.find((r) => r.name === NEW_ROLE_NAME)
    expect(newRole).toBeDefined()

    const channelDetailsFirstCheck = await spaceDapp.getChannelDetails(
        spaceId!,
        createdChannel!.channelNetworkId!,
    )
    expect(channelDetailsFirstCheck?.name).toBe(TEST_CHANNEL_NAME)
    expect(channelDetailsFirstCheck?.roles).toHaveLength(0)

    const updateChannelOp = await userOps.sendUpdateChannelOp([
        {
            spaceId,
            channelId: createdChannel!.channelNetworkId!,
            channelName: NEW_CHANNEL_NAME,
            channelDescription: '',
            roleIds: [newRole!.roleId],
        },
        alice.wallet,
    ])
    await waitForOpAndTx(updateChannelOp, alice)
    await sleepBetweenTxs()

    const channelDetailsSecondCheck = await spaceDapp.getChannelDetails(
        spaceId!,
        createdChannel!.channelNetworkId!,
    )
    expect(channelDetailsSecondCheck?.name).toBe(NEW_CHANNEL_NAME)
    expect(channelDetailsSecondCheck?.roles).toHaveLength(1)
    expect(channelDetailsSecondCheck?.roles.find((r) => r.name === NEW_ROLE_NAME)).toBeDefined()
})

test("can create a channel when roles is gated by user's smart account", async () => {
    const alice = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
    )
    await alice.ready

    const bob = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_2),
    )
    await bob.ready

    const { spaceDapp, userOps } = createSpaceDappAndUserops(alice)

    const createSpaceOp = await createUngatedSpace({
        userOps,
        spaceDapp,
        signer: alice.wallet,
        rolePermissions: [Permission.Read, Permission.Write],
    })
    const txReceipt = await waitForOpAndTx(createSpaceOp, alice)
    await sleepBetweenTxs()

    const spaceId = await getSpaceId(spaceDapp, txReceipt)

    // join space
    const joinOp = await userOps.sendJoinSpaceOp([spaceId, bob.wallet.address, bob.wallet])
    await waitForOpAndTx(joinOp, bob)
    await sleepBetweenTxs()

    const bobsSmartAccount = await userOps.getAbstractAccountAddress({
        rootKeyAddress: (await bob.wallet.getAddress()) as Address,
    })
    expect(bobsSmartAccount).toBeDefined()

    // create a role gated by bob's smart account
    const createRoleOp = await userOps.sendCreateRoleOp([
        spaceId,
        NEW_ROLE_NAME,
        [Permission.Read, Permission.Write, Permission.AddRemoveChannels],
        [bobsSmartAccount!],
        NoopRuleData,
        alice.wallet,
    ])
    await waitForOpAndTx(createRoleOp, alice)
    await sleepBetweenTxs()

    const roles = await spaceDapp.getRoles(spaceId)
    const newRole = roles.find((r) => r.name === NEW_ROLE_NAME)
    expect(newRole).toBeDefined()

    // create a channel
    const createChannelOp = await userOps.sendCreateChannelOp([
        spaceId,
        TEST_CHANNEL_NAME,
        'channel description',
        makeUniqueChannelStreamId(spaceId),
        // roleIds
        [newRole!.roleId],
        alice.wallet,
    ])
    await waitForOpAndTx(createChannelOp, alice)
    await sleepBetweenTxs()

    const channels = await spaceDapp.getChannels(spaceId)
    const createdChannel = channels.find((c) => c.name === TEST_CHANNEL_NAME)
    expect(createdChannel).toBeDefined()
})
