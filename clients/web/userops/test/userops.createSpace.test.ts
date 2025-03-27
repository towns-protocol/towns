import { Address, LocalhostWeb3Provider } from '@towns-protocol/web3'
import { Permission } from '@towns-protocol/web3'
import {
    createSpaceDappAndUserops,
    createUngatedSpace,
    generatePrivyWalletIfKey,
    getSpaceId,
} from './utils'
import { entryPoint07Address, entryPoint06Address } from 'viem/account-abstraction'
import { ERC4337 } from '../src/constants'

test('simple account can send createSpace user op', async () => {
    const bob = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
    )
    await bob.ready

    const { spaceDapp, userOps } = await createSpaceDappAndUserops(bob, 'simple')

    const client = await userOps.getSmartAccountClient({ signer: bob.wallet })
    expect(client.entrypointAddress).toBe(entryPoint06Address)
    expect(client.factoryAddress).toBe(ERC4337.SimpleAccount.Factory)

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
    const aaAddress = await userOps.getAbstractAccountAddress({
        rootKeyAddress: (await bob.wallet.getAddress()) as Address,
    })
    expect(aaAddress).toBeDefined()

    const spaceId = await getSpaceId(spaceDapp, txReceipt, bob.wallet.address, userOps)
    expect(spaceId).toBeDefined()

    let town
    try {
        town = await spaceDapp.getSpaceInfo(spaceId)
    } catch (error) {
        throw new Error("can't fetch town data: " + JSON.stringify(error))
    }
    expect(town?.networkId).toBe(spaceId)

    const op2 = await createUngatedSpace({
        userOps,
        spaceDapp,
        signer: bob.wallet,
        rolePermissions: [Permission.Read, Permission.Write],
    })
    const opReceipt2 = await op2.wait()
    expect(opReceipt2?.transactionHash).toBeDefined()
    expect(opReceipt2?.args.success).toBe(true)

    const txReceipt2 = await bob.waitForTransaction(opReceipt2!.transactionHash)
    expect(txReceipt2?.status).toBe(1)
    const aaAddress2 = await userOps.getAbstractAccountAddress({
        rootKeyAddress: (await bob.wallet.getAddress()) as Address,
    })
    expect(aaAddress2).toBeDefined()

    const spaceId2 = await getSpaceId(spaceDapp, txReceipt2, bob.wallet.address, userOps)
    expect(spaceId2).toBeDefined()

    let town2
    try {
        town2 = await spaceDapp.getSpaceInfo(spaceId2)
    } catch (error) {
        throw new Error("can't fetch town data: " + JSON.stringify(error))
    }
    expect(town2?.networkId).toBe(spaceId2)
})

test('modular account can send createSpace user op', async () => {
    const bob = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
    )
    await bob.ready

    const { spaceDapp, userOps } = await createSpaceDappAndUserops(bob, 'modular')

    const client = await userOps.getSmartAccountClient({ signer: bob.wallet })
    expect(client.entrypointAddress).toBe(entryPoint07Address)
    expect(client.factoryAddress).toBe(ERC4337.ModularAccount.Factory)

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
    const aaAddress = await userOps.getAbstractAccountAddress({
        rootKeyAddress: (await bob.wallet.getAddress()) as Address,
    })
    expect(aaAddress).toBeDefined()

    const spaceId = await getSpaceId(spaceDapp, txReceipt, bob.wallet.address, userOps)
    expect(spaceId).toBeDefined()

    let town
    try {
        town = await spaceDapp.getSpaceInfo(spaceId)
    } catch (error) {
        throw new Error("can't fetch town data: " + JSON.stringify(error))
    }
    expect(town?.networkId).toBe(spaceId)

    const op2 = await createUngatedSpace({
        userOps,
        spaceDapp,
        signer: bob.wallet,
        rolePermissions: [Permission.Read, Permission.Write],
    })
    const opReceipt2 = await op2.wait()
    expect(opReceipt2?.transactionHash).toBeDefined()
    expect(opReceipt2?.args.success).toBe(true)

    const txReceipt2 = await bob.waitForTransaction(opReceipt2!.transactionHash)
    expect(txReceipt2?.status).toBe(1)
    const aaAddress2 = await userOps.getAbstractAccountAddress({
        rootKeyAddress: (await bob.wallet.getAddress()) as Address,
    })
    expect(aaAddress2).toBeDefined()

    const spaceId2 = await getSpaceId(spaceDapp, txReceipt2, bob.wallet.address, userOps)
    expect(spaceId2).toBeDefined()

    let town2
    try {
        town2 = await spaceDapp.getSpaceInfo(spaceId2)
    } catch (error) {
        throw new Error("can't fetch town data: " + JSON.stringify(error))
    }
    expect(town2?.networkId).toBe(spaceId2)
})
