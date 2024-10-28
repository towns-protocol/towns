import { Address, LocalhostWeb3Provider } from '@river-build/web3'
import { Permission } from '@river-build/web3'
import {
    createFixedPriceSpace,
    createSpaceDappAndUserops,
    fundWallet,
    generatePrivyWalletIfKey,
    getSpaceId,
    waitForOpAndTx,
} from './utils'

test('can send prepay membership op, and user can join for free', async () => {
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

    const spaceId = await getSpaceId(spaceDapp, txReceipt, bob.wallet.address, userOpsBob)

    await expect(() =>
        userOpsAlice.sendJoinSpaceOp([spaceId, alice.wallet.address, alice.wallet]),
    ).rejects.toThrow()

    const aaAddress = await userOpsBob.getAbstractAccountAddress({
        rootKeyAddress: bob.wallet.address as Address,
    })
    expect(aaAddress).toBeDefined()

    const receipt = await fundWallet(aaAddress!, bob)
    expect(receipt?.status).toBe(1)

    const prepaidOp = await userOpsBob.sendPrepayMembershipOp([spaceId, 1, bob.wallet])
    const prepaidOpReceipt = await prepaidOp.wait()
    expect(prepaidOpReceipt?.transactionHash).toBeDefined()
    expect(prepaidOpReceipt?.args.success).toBe(true)

    const prepaidSeats = await spaceDapp.getPrepaidMembershipSupply(spaceId)
    expect(prepaidSeats.toNumber()).toBe(1)

    // now alice can join
    const joinOp = await userOpsAlice.sendJoinSpaceOp([spaceId, alice.wallet.address, alice.wallet])
    await waitForOpAndTx(joinOp, alice)

    const aliceMembership = await spaceDapp.hasSpaceMembership(spaceId, alice.wallet.address)
    expect(aliceMembership).toBe(true)
})
