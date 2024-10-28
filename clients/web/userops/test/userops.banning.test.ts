import { LocalhostWeb3Provider } from '@river-build/web3'
import { Permission } from '@river-build/web3'
import {
    createSpaceDappAndUserops,
    createUngatedSpace,
    generatePrivyWalletIfKey,
    getSpaceId,
    sleepBetweenTxs,
    waitForOpAndTx,
} from './utils'

test('can send banning user ops', async () => {
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
