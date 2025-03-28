import { LocalhostWeb3Provider, NoopRuleData } from '@towns-protocol/web3'
import { Permission } from '@towns-protocol/web3'
import {
    createSpaceDappAndUserops,
    createUngatedSpace,
    generatePrivyWalletIfKey,
    getSpaceId,
    sendCreateRoleOp,
    sleepBetweenTxs,
    waitForOpAndTx,
} from './utils'

console.log('what')

test('space ownercan ban and unban', async () => {
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

    const { spaceDapp, userOps: userOpsAlice } = await createSpaceDappAndUserops(alice)
    const { userOps: userOpsBob } = await createSpaceDappAndUserops(bob)

    const createSpaceOp = await createUngatedSpace({
        userOps: userOpsAlice,
        spaceDapp,
        signer: alice.wallet,
        rolePermissions: [Permission.Read, Permission.Write],
    })

    const txReceipt = await waitForOpAndTx(createSpaceOp, alice)
    await sleepBetweenTxs()

    const spaceId = await getSpaceId(spaceDapp, txReceipt, alice.wallet.address, userOpsAlice)

    // join space
    const joinOp = await userOpsBob.sendJoinSpaceOp([spaceId, bob.wallet.address, bob.wallet])
    await waitForOpAndTx(joinOp, bob)
    await sleepBetweenTxs()

    const bobMembership = await spaceDapp.hasSpaceMembership(spaceId, bob.wallet.address)
    expect(bobMembership).toBe(true)

    // ban bob
    const banOp = await userOpsAlice.sendBanWalletAddressOp([
        spaceId,
        bob.wallet.address,
        alice.wallet,
    ])
    await waitForOpAndTx(banOp, alice)
    await sleepBetweenTxs()

    let bannedWalletAddresses = await spaceDapp.bannedWalletAddresses(spaceId)
    expect(bannedWalletAddresses).toContain(bob.wallet.address)

    // unban bob
    const unbanOp = await userOpsAlice.sendUnbanWalletAddressOp([
        spaceId,
        bob.wallet.address,
        alice.wallet,
    ])
    await waitForOpAndTx(unbanOp, alice)
    await sleepBetweenTxs()

    bannedWalletAddresses = await spaceDapp.bannedWalletAddresses(spaceId)
    expect(bannedWalletAddresses).not.toContain(bob.wallet.address)
})

test('user with ban permission can ban and unban', async () => {
    const alice = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
    )
    await alice.ready

    const adminUser = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_2),
    )
    await adminUser.ready

    const carol = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(),
    )
    await carol.ready

    const { spaceDapp, userOps: userOpsAlice } = await createSpaceDappAndUserops(alice)
    const { userOps: userOpsBob } = await createSpaceDappAndUserops(adminUser)
    const { userOps: userOpsCarol } = await createSpaceDappAndUserops(carol)

    const createSpaceOp = await createUngatedSpace({
        userOps: userOpsAlice,
        spaceDapp,
        signer: alice.wallet,
        rolePermissions: [Permission.Read, Permission.Write],
    })

    const txReceipt = await waitForOpAndTx(createSpaceOp, alice)
    await sleepBetweenTxs()

    const spaceId = await getSpaceId(spaceDapp, txReceipt, alice.wallet.address, userOpsAlice)

    // join space
    const joinOp = await userOpsBob.sendJoinSpaceOp([
        spaceId,
        adminUser.wallet.address,
        adminUser.wallet,
    ])
    await waitForOpAndTx(joinOp, adminUser)
    const joinOpCarol = await userOpsCarol.sendJoinSpaceOp([
        spaceId,
        carol.wallet.address,
        carol.wallet,
    ])
    await waitForOpAndTx(joinOpCarol, carol)
    await sleepBetweenTxs()

    const bobMembership = await spaceDapp.hasSpaceMembership(spaceId, adminUser.wallet.address)
    expect(bobMembership).toBe(true)
    const carolMembership = await spaceDapp.hasSpaceMembership(spaceId, carol.wallet.address)
    expect(carolMembership).toBe(true)

    // create a role
    const createRoleOp = await sendCreateRoleOp(
        userOpsAlice,
        spaceId,
        'Admin',
        [Permission.ModifyBanning],
        [adminUser.wallet.address],
        NoopRuleData,
        alice.wallet,
    )

    await waitForOpAndTx(createRoleOp, alice)
    await sleepBetweenTxs()

    // adminUser bans carol
    const banOp = await userOpsBob.sendBanWalletAddressOp([
        spaceId,
        carol.wallet.address,
        adminUser.wallet,
    ])
    await waitForOpAndTx(banOp, adminUser)
    await sleepBetweenTxs()

    let bannedWalletAddresses = await spaceDapp.bannedWalletAddresses(spaceId)
    expect(bannedWalletAddresses).toContain(carol.wallet.address)
    let isBanned = await spaceDapp.walletAddressIsBanned(spaceId, carol.wallet.address)
    expect(isBanned).toBe(true)

    // adminUser unbans carol
    const unbanOp = await userOpsAlice.sendUnbanWalletAddressOp([
        spaceId,
        carol.wallet.address,
        adminUser.wallet,
    ])
    await waitForOpAndTx(unbanOp, adminUser)
    await sleepBetweenTxs()

    bannedWalletAddresses = await spaceDapp.bannedWalletAddresses(spaceId)
    expect(bannedWalletAddresses).not.toContain(carol.wallet.address)
    isBanned = await spaceDapp.walletAddressIsBanned(spaceId, carol.wallet.address)
    expect(isBanned).toBe(false)
})
