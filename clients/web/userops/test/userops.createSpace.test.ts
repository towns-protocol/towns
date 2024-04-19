import { LocalhostWeb3Provider } from '@river-build/web3'
import { Permission } from '@river-build/web3'
import { createSpaceDappAndUserops, createUngatedSpace, generatePrivyWalletIfKey } from './utils'

test('can send createSpace user op', async () => {
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

    const spaceAddress = spaceDapp.getSpaceAddress(txReceipt)
    expect(spaceAddress).toBeDefined()
    const spaceId = '10' + spaceAddress!.slice(2) + '0'.repeat(64 - spaceAddress!.length)
    expect(spaceId).toBeDefined()

    let town
    try {
        town = await spaceDapp.getSpaceInfo(spaceId)
    } catch (error) {
        throw new Error("can't fetch town data: " + JSON.stringify(error))
    }
    expect(town?.networkId).toBe(spaceId)
})
