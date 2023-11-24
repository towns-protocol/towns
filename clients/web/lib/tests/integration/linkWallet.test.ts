/**
 * @group casablanca
 */
import { Wallet } from 'ethers'
import { registerAndStartClients } from './helpers/TestUtils'
import { ZionTestWeb3Provider } from './helpers/ZionTestWeb3Provider'
describe('Link Wallet', () => {
    test('link wallet', async () => {
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        const metamaskWallet = await generateNewWallet()

        const tx_link = await alice.linkWallet(alice.provider.wallet, metamaskWallet)
        if (tx_link.transaction?.hash) {
            await alice.opts.web3Provider?.waitForTransaction(tx_link.transaction?.hash)
        }
        expect(tx_link.error).toBeUndefined()
        expect(tx_link.transaction?.hash).toBeDefined()

        const aliceAddress = alice.getUserId()
        if (!aliceAddress) {
            throw new Error('alice address is undefined')
        }

        const bobAddress = bob.getUserId()
        if (!bobAddress) {
            throw new Error('bob address is undefined')
        }

        // check that the wallet is linked
        const wallets = await alice.getLinkedWallets(aliceAddress)
        expect(wallets).toContain(await metamaskWallet.getAddress())

        // check that we cannot link the same wallet twice
        const tx_link_again = await bob.linkWallet(bob.provider.wallet, metamaskWallet)
        if (tx_link_again.transaction?.hash) {
            await alice.opts.web3Provider?.waitForTransaction(tx_link_again.transaction?.hash)
        }

        expect(tx_link_again.error).toBeDefined()
        expect(tx_link_again.error?.name).toBe('WalletLink__LinkAlreadyExists')
        expect(tx_link_again.transaction?.hash).toBeUndefined()

        // remove link
        const tx_remove = await alice.removeLink(
            alice.provider.wallet,
            await metamaskWallet.getAddress(),
        )
        if (tx_remove.transaction?.hash) {
            await alice.opts.web3Provider?.waitForTransaction(tx_remove.transaction?.hash)
        }

        expect(tx_remove.error).toBeUndefined()

        // link with bob now
        const tx_link_again_bob = await bob.linkWallet(bob.provider.wallet, metamaskWallet)
        if (tx_link_again_bob.transaction?.hash) {
            await alice.opts.web3Provider?.waitForTransaction(tx_link_again_bob.transaction?.hash)
        }
        expect(tx_link_again_bob.error).toBeUndefined()

        // check that the wallet is linked
        const bob_wallets = await bob.getLinkedWallets(bobAddress)
        expect(bob_wallets).toContain(await metamaskWallet.getAddress())
    })
})

async function generateNewWallet(): Promise<Wallet> {
    const provider = new ZionTestWeb3Provider()
    await provider.fundWallet()
    return provider.wallet
}
