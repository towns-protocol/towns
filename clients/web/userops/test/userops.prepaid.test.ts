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

    const { spaceDapp, userOps } = createSpaceDappAndUserops(bob)

    // create a space that costs
    const op = await createFixedPriceSpace({
        userOps,
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

    await expect(() =>
        userOps.sendJoinSpaceOp([spaceId, alice.wallet.address, alice.wallet]),
    ).rejects.toThrow()

    const aaAddress = await userOps.getAbstractAccountAddress({
        rootKeyAddress: bob.wallet.address as Address,
    })
    expect(aaAddress).toBeDefined()

    const receipt = await fundWallet(aaAddress!, bob)
    expect(receipt?.status).toBe(1)

    const prepaidOp = await userOps.sendPrepayMembershipOp([spaceId, 1, bob.wallet])
    const prepaidOpReceipt = await prepaidOp.wait()
    expect(prepaidOpReceipt?.transactionHash).toBeDefined()
    expect(prepaidOpReceipt?.args.success).toBe(true)

    const prepaidSeats = await spaceDapp.getPrepaidMembershipSupply(spaceId)
    expect(prepaidSeats.toNumber()).toBe(1)

    // now alice can join
    const joinOp = await userOps.sendJoinSpaceOp([spaceId, alice.wallet.address, alice.wallet])
    await waitForOpAndTx(joinOp, alice)

    const aliceMembership = await spaceDapp.hasSpaceMembership(spaceId, alice.wallet.address)
    expect(aliceMembership).toBe(true)
})
