import { LocalhostWeb3Provider } from '@river-build/web3'
import { Permission } from '@river-build/web3'
import {
    createSpaceDappAndUserops,
    createUngatedSpace,
    fundWallet,
    generatePrivyWalletIfKey,
    getSpaceId,
    sleepBetweenTxs,
    waitForOpAndTx,
} from './utils'
import { parseEther } from 'viem'

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
})

test('can join a paid space', async () => {
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
        membershipPrice: parseEther('0.1'),
        freeAllocation: 0,
    })
    const txReceipt = await waitForOpAndTx(createSpaceOp, alice)
    await sleepBetweenTxs()

    const spaceId = await getSpaceId(spaceDapp, txReceipt, alice.wallet.address, userOpsAlice)

    expect((await spaceDapp.getMembershipInfo(spaceId)).price.toBigInt()).toBe(parseEther('0.1'))

    // join space
    await fundWallet(
        (await userOpsBob.getAbstractAccountAddress({
            rootKeyAddress: bob.wallet.address as `0x${string}`,
        })) ?? '',
        alice,
    )
    const joinOp = await userOpsBob.sendJoinSpaceOp([spaceId, bob.wallet.address, bob.wallet])
    await waitForOpAndTx(joinOp, bob)
    await sleepBetweenTxs()

    const bobMembership = await spaceDapp.hasSpaceMembership(spaceId, bob.wallet.address)
    expect(bobMembership).toBe(true)
})
