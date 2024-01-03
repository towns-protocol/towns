import { UserOpSpaceDapp } from '../src/v3/UserOpSpaceDapp'
import { TestWeb3Provider } from './TestWeb3Provider'
import { ethers } from 'ethers'

test.skip('should be able to send some funds via a user operation', async () => {
    const bob = await TestWeb3Provider.init()
    if ((await bob.getNetwork()).chainId !== 31337) {
        throw new Error('this test should only be run against a local anvil instance')
    }

    await bob.fundWallet()

    const spaceDapp = await UserOpSpaceDapp.init({
        chainId: bob.network.chainId,
        provider: bob,
        bundlerUrl: process.env.BUNDLER_URL,
        rpcUrl: process.env.RPC_URL!,
        entryPointAddress: process.env.ENTRY_POINT_ADDRESS,
        factoryAddress: process.env.FACTORY_ADDRESS,
    })

    // must fund the AA wallet to pass gas verification checks b/c no paymaster
    await bob.fundWallet(
        await spaceDapp.getAbstractAccountAddress({
            signer: bob.wallet,
        }),
    )

    const newWallet = ethers.Wallet.createRandom().connect(bob)

    const op = await spaceDapp.sendFunds({
        signer: bob.wallet,
        recipient: newWallet.address,
        value: ethers.utils.parseEther('0.001'),
    })
    const receipt = await op.wait()
    expect(receipt?.transactionHash).toBeDefined()
    expect(receipt?.args.success).toBe(true)
    await bob.waitForTransaction(receipt!.transactionHash)
    expect((await bob.getBalance(newWallet.address)).toBigInt()).toBeGreaterThan(0)
})
