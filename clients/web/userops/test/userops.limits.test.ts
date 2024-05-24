import { LocalhostWeb3Provider, NoopRuleData, Permission } from '@river-build/web3'
import {
    createSpaceDappAndUserops,
    createUngatedSpace,
    generatePrivyWalletIfKey,
    getSpaceId,
    sleepBetweenTxs,
    waitForOpAndTx,
} from './utils'
import { makeUniqueChannelStreamId } from '@river/sdk'
import { TestConstants } from 'use-towns-client/tests/integration/helpers/TestConstants'

// run this test with script/run-stackup-worker.sh -l
// the limit for each userop will be 1
// additional userops for each type should be rejected
//
// [x] create space
// [x] create role
// [x] update role
// [x] delete role
//
// [x] create channel
// [x] update channel
// [ ] remove channel - dont have this feature
//
// [x] update space info
//
// [x] ban user
// [x] unban user

test('will reject each userop if beyond the limit', async () => {
    ////////////////////////////////////////
    // Create a space
    ////////////////////////////////////////
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
    const createSpaceReceipt1 = await waitForOpAndTx(createSpaceOp, alice)
    expect(createSpaceReceipt1.status).toBe(1)
    await sleepBetweenTxs()

    // in tests we skip gas estimates (b/c they are expected to have sponsorship, else test wallets need real funds)
    // so this should throw with either gas estimates, or if default gas estimate is fine, then it will throw b/c no paymaster and wallet has no funds
    expect(() =>
        createUngatedSpace({
            userOps,
            spaceDapp,
            signer: alice.wallet,
            rolePermissions: [Permission.Read, Permission.Write],
        }),
    ).rejects.toThrow()

    const spaceId = await getSpaceId(spaceDapp, createSpaceReceipt1)

    ////////////////////////////////////////
    // create role
    ////////////////////////////////////////

    const createRoleOp = await userOps.sendCreateRoleOp([
        spaceId,
        'dummy role',
        [],
        [],
        NoopRuleData,
        alice.wallet,
    ])

    const createRoleRecipt = await waitForOpAndTx(createRoleOp, alice)
    expect(createRoleRecipt.status).toBe(1)
    await sleepBetweenTxs()

    expect(() =>
        userOps.sendCreateRoleOp([spaceId, 'dummy role', [], [], NoopRuleData, alice.wallet]),
    ).rejects.toThrow()

    ////////////////////////////////////////
    // update role
    ////////////////////////////////////////
    const updateRoleOp = await userOps.sendUpdateRoleOp([
        {
            spaceNetworkId: spaceId,
            roleId: 3, // created role will have been the 3rd role
            roleName: 'new name',
            permissions: [Permission.Read, Permission.Write],
            users: [],
            ruleData: NoopRuleData,
        },
        alice.wallet,
    ])
    const updateReceipt = await waitForOpAndTx(updateRoleOp, alice)
    expect(updateReceipt.status).toBe(1)

    expect(() =>
        userOps.sendUpdateRoleOp([
            {
                spaceNetworkId: spaceId,
                roleId: 3, // created role will have been the 3rd role
                roleName: 'new name',
                permissions: [Permission.Read, Permission.Write],
                users: [],
                ruleData: NoopRuleData,
            },
            alice.wallet,
        ]),
    ).rejects.toThrow()

    ////////////////////////////////////////
    // delete role
    ////////////////////////////////////////
    const deleteRoleOp = await userOps.sendDeleteRoleOp([spaceId, 3, alice.wallet])
    const deleteReceipt = await waitForOpAndTx(deleteRoleOp, alice)
    await sleepBetweenTxs()
    expect(deleteReceipt.status).toBe(1)

    expect(() => userOps.sendDeleteRoleOp([spaceId, 2, alice.wallet])).rejects.toThrow()

    ////////////////////////////////////////
    // create channel
    ////////////////////////////////////////
    const createChannelOp = await userOps.sendCreateChannelOp([
        spaceId,
        'test',
        makeUniqueChannelStreamId(spaceId),
        // roleIds
        [],
        alice.wallet,
    ])
    const createChannelReceipt = await waitForOpAndTx(createChannelOp, alice)
    await sleepBetweenTxs()
    expect(createChannelReceipt.status).toBe(1)

    expect(() =>
        userOps.sendCreateChannelOp([
            spaceId,
            'test',
            makeUniqueChannelStreamId(spaceId),
            // roleIds
            [],
            alice.wallet,
        ]),
    ).rejects.toThrow()

    ////////////////////////////////////////
    // update channel
    ////////////////////////////////////////
    const channels = await spaceDapp.getChannels(spaceId)
    expect(channels).toHaveLength(2) // default plus created one
    const createdChannel = channels.find((c) => c.name === 'test')

    const updateChannelOp = await userOps.sendUpdateChannelOp([
        {
            spaceId,
            channelId: createdChannel!.channelNetworkId!,
            channelName: 'new channel name',
            channelDescription: '',
            roleIds: [],
        },
        alice.wallet,
    ])
    const updateChannelReceipt = await waitForOpAndTx(updateChannelOp, alice)
    await sleepBetweenTxs()
    expect(updateChannelReceipt.status).toBe(1)

    expect(() =>
        userOps.sendUpdateChannelOp([
            {
                spaceId,
                channelId: createdChannel!.channelNetworkId!,
                channelName: 'new channel name 2',
                channelDescription: '',
                roleIds: [],
            },
            alice.wallet,
        ]),
    ).rejects.toThrow()

    ////////////////////////////////////////
    // update space info
    ////////////////////////////////////////
    const updateSpaceOp = await userOps.sendUpdateSpaceNameOp([
        spaceId,
        'new space name',
        alice.wallet,
    ])
    const updateSpaceReceipt = await waitForOpAndTx(updateSpaceOp, alice)
    await sleepBetweenTxs()
    expect(updateSpaceReceipt.status).toBe(1)

    expect(() =>
        userOps.sendUpdateSpaceNameOp([spaceId, 'new space name 2', alice.wallet]),
    ).rejects.toThrow()

    ////////////////////////////////////////
    // ban user
    ////////////////////////////////////////
    const bob = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
    )
    await bob.ready
    const joinOp = await userOps.sendJoinSpaceOp([spaceId, bob.wallet.address, bob.wallet])
    const joinReceipt = await waitForOpAndTx(joinOp, bob)
    await sleepBetweenTxs()
    expect(joinReceipt.status).toBe(1)

    const steve = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
    )
    await steve.ready
    const joinOpSteve = await userOps.sendJoinSpaceOp([spaceId, steve.wallet.address, steve.wallet])
    const joinReceiptSteve = await waitForOpAndTx(joinOpSteve, steve)
    await sleepBetweenTxs()
    expect(joinReceiptSteve.status).toBe(1)

    const banOp = await userOps.sendBanWalletAddressOp([spaceId!, bob.wallet.address, alice.wallet])
    const banReceipt = await waitForOpAndTx(banOp, alice)
    await sleepBetweenTxs()
    expect(banReceipt.status).toBe(1)

    expect(() =>
        userOps.sendBanWalletAddressOp([spaceId!, steve.wallet.address, alice.wallet]),
    ).rejects.toThrow()

    const unbanOp = await userOps.sendUnbanWalletAddressOp([
        spaceId!,
        bob.wallet.address,
        alice.wallet,
    ])
    const unbanReceipt = await waitForOpAndTx(unbanOp, alice)
    await sleepBetweenTxs()
    expect(unbanReceipt.status).toBe(1)

    expect(() =>
        userOps.sendUnbanWalletAddressOp([spaceId!, steve.wallet.address, alice.wallet]),
    ).rejects.toThrow()
}, 200_000)

// [x ] link wallet
test('will reject wallet link operations if beyond the limit', async () => {
    const alice = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
    )
    await alice.ready

    const { userOps } = createSpaceDappAndUserops(alice)

    ////////////////////////////////////////
    // link wallet
    ////////////////////////////////////////
    const metamaskWallet = await TestConstants.getUnfundedWallet()

    const metamaskWallet2 = await TestConstants.getUnfundedWallet()

    const linkWalletTx = await userOps.sendLinkEOAToRootKeyOp([alice.wallet, metamaskWallet])
    const linkReceipt = await waitForOpAndTx(linkWalletTx, alice)
    await sleepBetweenTxs()
    expect(linkReceipt.status).toBe(1)

    expect(() => userOps.sendLinkEOAToRootKeyOp([alice.wallet, metamaskWallet2])).rejects.toThrow()
})
