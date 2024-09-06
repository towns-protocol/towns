import { Address, LocalhostWeb3Provider, NoopRuleData } from '@river-build/web3'
import { Permission } from '@river-build/web3'
import {
    sendCreateRoleOp,
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

    const createRoleOp = await sendCreateRoleOp(
        userOps,
        spaceId,
        NEW_ROLE_NAME,
        [Permission.Read],
        [],
        NoopRuleData,
        alice.wallet,
    )
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

test('can create a channel with permission overrides', async () => {
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

    const roles = await spaceDapp.getRoles(spaceId)
    const everyoneRole = roles.find((r) => r.name === 'Everyone')

    expect(everyoneRole).toBeDefined()

    if (!everyoneRole) {
        return
    }

    const defaultRolePermissions = await spaceDapp.getPermissionsByRoleId(
        spaceId,
        everyoneRole?.roleId,
    )

    expect(defaultRolePermissions).toContain(Permission.Read)

    // create a channel
    const createChannelOp = await userOps.sendCreateChannelOp([
        spaceId,
        TEST_CHANNEL_NAME,
        'channel description',
        makeUniqueChannelStreamId(spaceId),
        // gate via everyone role + override
        [
            {
                roleId: everyoneRole.roleId,
                permissions: [Permission.Read, Permission.PinMessage],
            },
        ],
        alice.wallet,
    ])
    await waitForOpAndTx(createChannelOp, alice)
    await sleepBetweenTxs()

    const channels = await spaceDapp.getChannels(spaceId)

    const createdChannel = channels.find((c) => c.name === TEST_CHANNEL_NAME)
    expect(createdChannel).toBeDefined()

    if (!createdChannel) {
        return
    }

    // check that the override is populated
    const channelPermissionOverridesAfterCreate = await spaceDapp.getChannelPermissionOverrides(
        spaceId,
        everyoneRole.roleId,
        createdChannel.channelNetworkId,
    )
    expect(channelPermissionOverridesAfterCreate).not.toHaveLength(0)

    const channelDetailsFirstCheck = await spaceDapp.getChannelDetails(
        spaceId!,
        createdChannel!.channelNetworkId!,
    )

    let hasPermission: boolean

    // check if permission overrides upon channel creation worked

    hasPermission = await spaceDapp.isEntitledToChannelUncached(
        spaceId,
        createdChannel.channelNetworkId,
        bob.wallet.address,
        Permission.PinMessage,
    )
    expect(hasPermission).toBe(true)

    hasPermission = await spaceDapp.isEntitledToChannelUncached(
        spaceId,
        createdChannel.channelNetworkId,
        bob.wallet.address,
        Permission.Write,
    )
    expect(hasPermission).toBe(false)

    expect(channelDetailsFirstCheck?.name).toBe(TEST_CHANNEL_NAME)
    expect(channelDetailsFirstCheck?.roles).toHaveLength(1)

    // test clear override

    const clearChannelOverride = await userOps.sendClearChannelPermissionOverridesOp([
        {
            spaceNetworkId: spaceId,
            channelId: createdChannel.channelNetworkId,
            roleId: everyoneRole.roleId,
        },
        alice.wallet,
    ])
    await waitForOpAndTx(clearChannelOverride, alice)

    const channelPermissionOverrides = await spaceDapp.getChannelPermissionOverrides(
        spaceId,
        everyoneRole.roleId,
        createdChannel.channelNetworkId,
    )
    expect(channelPermissionOverrides).toHaveLength(0)

    // cache
    await sleepBetweenTxs(5_000)

    hasPermission = await spaceDapp.isEntitledToChannel(
        spaceId,
        createdChannel.channelNetworkId,
        bob.wallet.address,
        Permission.PinMessage,
    )
    expect(hasPermission).toBe(false)

    hasPermission = await spaceDapp.isEntitledToChannel(
        spaceId,
        createdChannel.channelNetworkId,
        bob.wallet.address,
        Permission.Write,
    )
    expect(hasPermission).toBe(true)

    // test update override

    const updateOverride = await userOps.sendSetChannelPermissionOverridesOp([
        {
            spaceNetworkId: spaceId,
            channelId: createdChannel.channelNetworkId,
            permissions: [Permission.Read],
            roleId: everyoneRole.roleId,
        },
        alice.wallet,
    ])
    await waitForOpAndTx(updateOverride, alice)
    await sleepBetweenTxs(5_000)

    // bob should not have the right to write anymore
    hasPermission = await spaceDapp.isEntitledToChannelUncached(
        spaceId,
        createdChannel.channelNetworkId,
        bob.wallet.address,
        Permission.Write,
    )
    expect(hasPermission).toBe(false)
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

    const { spaceDapp, userOps: userOpsAlice } = createSpaceDappAndUserops(alice)
    const { userOps: userOpsBob } = createSpaceDappAndUserops(bob)

    const createSpaceOp = await createUngatedSpace({
        userOps: userOpsAlice,
        spaceDapp,
        signer: alice.wallet,
        rolePermissions: [Permission.Read, Permission.Write],
    })
    const txReceipt = await waitForOpAndTx(createSpaceOp, alice)
    await sleepBetweenTxs()

    const spaceId = getSpaceId(spaceDapp, txReceipt)

    // join space
    const joinOp = await userOpsBob.sendJoinSpaceOp([spaceId, bob.wallet.address, bob.wallet])
    await waitForOpAndTx(joinOp, bob)
    await sleepBetweenTxs()

    const bobsSmartAccount = await userOpsBob.getAbstractAccountAddress({
        rootKeyAddress: (await bob.wallet.getAddress()) as Address,
    })
    expect(bobsSmartAccount).toBeDefined()

    // create a role gated by bob's smart account
    const createRoleOp = await sendCreateRoleOp(
        userOpsAlice,
        spaceId,
        NEW_ROLE_NAME,
        [Permission.Read, Permission.Write, Permission.AddRemoveChannels],
        [bobsSmartAccount!],
        NoopRuleData,
        alice.wallet,
    )
    await waitForOpAndTx(createRoleOp, alice)
    await sleepBetweenTxs()

    const roles = await spaceDapp.getRoles(spaceId)
    const newRole = roles.find((r) => r.name === NEW_ROLE_NAME)
    expect(newRole).toBeDefined()

    // create a channel
    const createChannelOp = await userOpsAlice.sendCreateChannelOp([
        spaceId,
        TEST_CHANNEL_NAME,
        'channel description',
        makeUniqueChannelStreamId(spaceId),
        // roleIds
        [{ roleId: newRole!.roleId, permissions: [] }],
        alice.wallet,
    ])
    await waitForOpAndTx(createChannelOp, alice)
    await sleepBetweenTxs()

    const channels = await spaceDapp.getChannels(spaceId)
    const createdChannel = channels.find((c) => c.name === TEST_CHANNEL_NAME)
    expect(createdChannel).toBeDefined()
})
