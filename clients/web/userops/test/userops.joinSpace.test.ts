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

test('can join an ungated space', async () => {
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

    const bobMembership = await spaceDapp.hasSpaceMembership(spaceId, bob.wallet.address)
    expect(bobMembership).toBe(true)
})
