//
// Reference in case we ever use local bundler for testing
//

import { Address, LocalhostWeb3Provider, SpaceDapp, getWeb3Deployment } from '@river-build/web3'
import { ethers } from 'ethers'
import { Address, ISpaceDapp } from '@river-build/web3'
import { TestUserOps } from './TestUserOps'

// these tests are comprised of basic transactions that don't interact with towns contracts per se,
// but instead make sure that user operations are working as expected
// this test does work with skandha bundler
describe.skip('sanity: user operations', () => {
    test('sanity: should be able to send some funds via a user operation without a paymaster', async () => {
        const bob = new LocalhostWeb3Provider(process.env.RPC_URL as string)
        await bob.ready
        const baseConfig = getWeb3Deployment(process.env.RIVER_ENV as string).base // see util.test.ts for loading from env
        if ((await bob.getNetwork()).chainId !== 31337) {
            throw new Error('this test should only be run against a local anvil instance')
        }
        await bob.fundWallet()
        const spaceDapp = new SpaceDapp(baseConfig, bob) as unknown as ISpaceDapp

        const userOps = new TestUserOps({
            provider: spaceDapp.provider,
            config: spaceDapp.config,
            spaceDapp,
            bundlerUrl: process.env.AA_BUNDLER_URL,
            paymasterProxyUrl: process.env.AA_PAYMASTER_PROXY_URL,
            aaRpcUrl: process.env.AA_RPC_URL!,
            entryPointAddress: process.env.AA_ENTRY_POINT_ADDRESS,
            factoryAddress: process.env.AA_FACTORY_ADDRESS,
        })
        // must fund the AA wallet to pass gas verification checks b/c no paymaster
        await bob.fundWallet(
            await userOps.getAbstractAccountAddress({
                rootKeyAddress: bob.wallet.address as Address,
            }),
        )
        const newWallet = ethers.Wallet.createRandom().connect(bob)
        const op = await userOps.sendFunds({
            signer: bob.wallet,
            recipient: newWallet.address,
            value: ethers.utils.parseEther('0.001'),
        })
        const receipt = await op.wait()
        expect(receipt?.transactionHash).toBeDefined()
        expect(receipt?.args.success).toBe(true)
        await bob.waitForTransaction(receipt?.transactionHash ?? '')
        expect((await bob.getBalance(newWallet.address)).toBigInt()).toBeGreaterThan(0)
    })
})
