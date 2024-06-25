import { LocalhostWeb3Provider } from '@river-build/web3'
import { Permission } from '@river-build/web3'
import {
    createSpaceDappAndUserops,
    createUngatedSpace,
    generatePrivyWalletIfKey,
    getSpaceId,
} from './utils'

/**
 * this tx costs eth. So it's not enabled against base-sepolia
 * This test is a placeholder for when we have a testnet
 */
test.skip('can send createSpace user op', async () => {
    const bob = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
    )
    await bob.ready

    const { spaceDapp, userOps } = createSpaceDappAndUserops(bob)

    const op = await createUngatedSpace({
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

    const prepaidOp = await userOps.sendPrepayMembershipOp([spaceId, 1, bob.wallet])
    const prepaidOpReceipt = await prepaidOp.wait()
    expect(prepaidOpReceipt?.transactionHash).toBeDefined()
    expect(prepaidOpReceipt?.args.success).toBe(true)

    const prepaidSeats = await spaceDapp.getPrepaidMembershipSupply(spaceId)
    expect(prepaidSeats.toNumber()).toBe(1)
})
