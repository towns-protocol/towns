import { LocalhostWeb3Provider } from '@towns-protocol/web3'
import { Permission } from '@towns-protocol/web3'
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
import { ERC4337 } from '../src/constants'
import { vi } from 'vitest'

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

    const smClient = await userOpsAlice.getSmartAccountClient({ signer: alice.wallet })
    if (process.env.AA_NEW_ACCOUNT_IMPLEMENTATION_TYPE === 'modular') {
        expect(smClient.type).toBe('modular')
        expect(smClient.factoryAddress).toBe(ERC4337.ModularAccount.Factory)
    } else if (process.env.AA_NEW_ACCOUNT_IMPLEMENTATION_TYPE === 'simple') {
        expect(smClient.type).toBe('simple')
        expect(smClient.factoryAddress).toBe(ERC4337.SimpleAccount.Factory)
    }

    const createSpaceOp = await createUngatedSpace({
        userOps: userOpsAlice,
        spaceDapp,
        signer: alice.wallet,
        rolePermissions: [Permission.Read, Permission.Write],
    })
    const txReceipt = await waitForOpAndTx(createSpaceOp, alice)
    await sleepBetweenTxs()

    const spaceId = await getSpaceId(spaceDapp, txReceipt, alice.wallet.address, userOpsAlice)

    const sendUserOpSpy = vi.spyOn(userOpsBob, 'sendUserOp')

    // join space
    const joinOp = await userOpsBob.sendJoinSpaceOp([spaceId, bob.wallet.address, bob.wallet])
    await waitForOpAndTx(joinOp, bob)
    await sleepBetweenTxs()

    // modular accounts should batch all userops
    const lastCall = sendUserOpSpy.mock.lastCall![0]
    if (process.env.AA_NEW_ACCOUNT_IMPLEMENTATION_TYPE === 'modular') {
        expect(Array.isArray(lastCall.toAddress)).toBe(true)
        expect(lastCall.toAddress!.length).toBe(2)
        expect(Array.isArray(lastCall.value)).toBe(true)
        expect((lastCall.value! as bigint[]).length).toBe(2)
        expect(Array.isArray(lastCall.callData)).toBe(true)
        expect((lastCall.callData! as string[]).length).toBe(2)
    } else {
        // in simple accounts, you have to link a smart account first, then this call is the join space call
        expect(typeof lastCall.toAddress).toBe('string')
        expect(typeof lastCall.value).toBe('bigint')
        expect(typeof lastCall.callData).toBe('string')
    }

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

    const sendUserOpSpy = vi.spyOn(userOpsBob, 'sendUserOp')

    const joinOp = await userOpsBob.sendJoinSpaceOp([spaceId, bob.wallet.address, bob.wallet])
    await waitForOpAndTx(joinOp, bob)
    await sleepBetweenTxs()

    // modular accounts should batch all userops
    const lastCall = sendUserOpSpy.mock.lastCall![0]
    if (process.env.AA_NEW_ACCOUNT_IMPLEMENTATION_TYPE === 'modular') {
        expect(Array.isArray(lastCall.toAddress)).toBe(true)
        expect(lastCall.toAddress!.length).toBe(2)
        expect(Array.isArray(lastCall.value)).toBe(true)
        expect((lastCall.value! as bigint[]).length).toBe(2)
        expect(Array.isArray(lastCall.callData)).toBe(true)
        expect((lastCall.callData! as string[]).length).toBe(2)
    } else {
        // in simple accounts, you have to link a smart account first, then this call is the join space call
        expect(typeof lastCall.toAddress).toBe('string')
        expect(typeof lastCall.value).toBe('bigint')
        expect(typeof lastCall.callData).toBe('string')
    }

    const bobMembership = await spaceDapp.hasSpaceMembership(spaceId, bob.wallet.address)
    expect(bobMembership).toBe(true)
})
