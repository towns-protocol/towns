import { Address, LocalhostWeb3Provider, Permission } from '@river-build/web3'
import {
    createFixedPriceSpace,
    createSpaceDappAndUserops,
    fundWallet,
    generatePrivyWalletIfKey,
    getSpaceId,
    waitForOpAndTx,
} from './utils'

import { Wallet } from 'ethers'

test('can withdraw space funds', async () => {
    const randomWallet = Wallet.createRandom()
    const bob = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
    )
    await bob.ready

    const alice = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
    )
    await alice.ready

    const { spaceDapp, userOps: userOpsBob } = createSpaceDappAndUserops(bob)
    const { userOps: userOpsAlice } = createSpaceDappAndUserops(alice)

    // create a space that costs
    const op = await createFixedPriceSpace({
        userOps: userOpsBob,
        spaceDapp,
        signer: bob.wallet,
        rolePermissions: [Permission.Read, Permission.Write],
    })
    const opReceipt = await op.wait()
    expect(opReceipt?.transactionHash).toBeDefined()
    expect(opReceipt?.args.success).toBe(true)

    const txReceipt = await bob.waitForTransaction(opReceipt!.transactionHash)
    expect(txReceipt?.status).toBe(1)

    const spaceId = getSpaceId(spaceDapp, txReceipt)

    const bobAAAddress = await userOpsBob.getAbstractAccountAddress({
        rootKeyAddress: bob.wallet.address as Address,
    })
    expect(bobAAAddress).toBeDefined()
    const aliceAAAddress = await userOpsBob.getAbstractAccountAddress({
        rootKeyAddress: alice.wallet.address as Address,
    })
    expect(aliceAAAddress).toBeDefined()

    const receipt = await fundWallet(aliceAAAddress!, alice)
    expect(receipt?.status).toBe(1)

    // now alice can join
    const joinOp = await userOpsAlice.sendJoinSpaceOp([spaceId, alice.wallet.address, alice.wallet])
    await waitForOpAndTx(joinOp, alice)

    const aliceMembership = await spaceDapp.hasSpaceMembership(spaceId, alice.wallet.address)
    expect(aliceMembership).toBe(true)

    const receiverBalance = await bob.getBalance(randomWallet.address)
    expect(receiverBalance.toBigInt()).toBe(0n)

    const withdrawOp = await userOpsBob.sendWithdrawSpaceFundsOp([
        spaceId,
        randomWallet.address,
        bob.wallet,
    ])
    await waitForOpAndTx(withdrawOp, bob)

    const receiverBalanceAfterWithdraw = await bob.getBalance(randomWallet.address)
    // cost of space - River fee
    expect(receiverBalanceAfterWithdraw.toBigInt()).toBe(475000000000000000n)
})
