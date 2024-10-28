import { Address, LocalhostWeb3Provider } from '@river-build/web3'
import { Permission } from '@river-build/web3'
import {
    createFixedPriceSpace,
    createSpaceDappAndUserops,
    fundWallet,
    generatePrivyWalletIfKey,
    getSpaceId,
    sleepBetweenTxs,
    waitForOpAndTx,
} from './utils'
import { expect, vi } from 'vitest'
import { ethers } from 'ethers'

test('userops with different values are sent correctly', async () => {
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

    const aaAddress = await userOpsBob.getAbstractAccountAddress({
        rootKeyAddress: bob.wallet.address as Address,
    })
    expect(aaAddress).toBeDefined()

    const receipt = await fundWallet(aaAddress!, bob)
    expect(receipt?.status).toBe(1)

    // create a space that cost
    const op = await createFixedPriceSpace({
        userOps: userOpsAlice,
        spaceDapp,
        signer: alice.wallet,
        rolePermissions: [Permission.Read, Permission.Write],
        price: '0.1',
    })
    const opReceipt = await op.wait()
    const spReceipt1 = await waitForOpAndTx(op, alice)
    expect(opReceipt?.transactionHash).toBeDefined()
    expect(opReceipt?.args.success).toBe(true)

    // create a space with different cost
    const op2 = await createFixedPriceSpace({
        userOps: userOpsAlice,
        spaceDapp,
        signer: alice.wallet,
        rolePermissions: [Permission.Read, Permission.Write],
        price: '0.2',
    })
    const opReceipt2 = await op2.wait()
    const spReceipt2 = await waitForOpAndTx(op2, alice)
    expect(opReceipt2?.transactionHash).toBeDefined()
    expect(opReceipt2?.args.success).toBe(true)

    const spaceId1 = await getSpaceId(spaceDapp, spReceipt1, alice.wallet.address, userOpsAlice)
    const spaceId2 = await getSpaceId(spaceDapp, spReceipt2, alice.wallet.address, userOpsAlice)

    expect(userOpsBob.middlewareVars.txValue).toBe(undefined)
    const bobBuilder = await userOpsBob.getBuilder({ signer: bob.wallet })
    const executeSpy = vi.spyOn(bobBuilder, 'execute')
    // join space
    const joinOp1 = await userOpsBob.sendJoinSpaceOp([spaceId1, bob.wallet.address, bob.wallet])
    await waitForOpAndTx(joinOp1, bob)
    await sleepBetweenTxs()
    const format = (val: string) => ethers.utils.formatEther(val)
    expect(format(executeSpy.mock.lastCall![1].toString())).toBe('0.1')
    expect(format(userOpsBob.middlewareVars.txValue!.toString())).toBe('0.1')

    await userOpsBob.sendJoinSpaceOp([spaceId2, bob.wallet.address, bob.wallet])
    expect(format(executeSpy.mock.lastCall![1].toString())).toBe('0.2')
    expect(format(userOpsBob.middlewareVars.txValue!.toString())).toBe('0.2')
})
