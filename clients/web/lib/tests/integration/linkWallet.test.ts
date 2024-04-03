/**
 * @group core
 */
import { createTestSpaceGatedByTownsNfts, registerAndStartClients } from './helpers/TestUtils'
import { TownsTestWeb3Provider } from './helpers/TownsTestWeb3Provider'
import { Permission } from '@river-build/web3'
import { TestConstants } from './helpers/TestConstants'
import { getTransactionHashFromTransactionOrUserOp } from '@towns/userops'
describe('Link Wallet', () => {
    // in this test the rootKey needs funds to link the wallet
    test('link wallet using linkEOAToRootKey', async () => {
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        const metamaskWallet = new TownsTestWeb3Provider().wallet

        await alice.fundWallet()
        await bob.fundWallet()

        expect((await bob.provider.getBalance(metamaskWallet.address)).toNumber()).toBe(0)

        // alice must have funds to link the wallet
        const tx_link = await alice.linkEOAToRootKey(alice.provider.wallet, metamaskWallet)
        const txHash = await getTransactionHashFromTransactionOrUserOp(tx_link.transaction)

        if (txHash) {
            await alice.opts.baseProvider?.waitForTransaction(txHash)
        }
        expect(tx_link.error).toBeUndefined()
        expect(txHash).toBeDefined()

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
        const tx_link_again = await bob.linkEOAToRootKey(bob.provider.wallet, metamaskWallet)
        const txHashAgain = await getTransactionHashFromTransactionOrUserOp(
            tx_link_again.transaction,
        )

        if (txHashAgain) {
            await alice.opts.baseProvider?.waitForTransaction(txHashAgain)
        }

        expect(tx_link_again.error).toBeDefined()
        expect(tx_link_again.error?.name).toBe('WalletLink__LinkAlreadyExists')
        expect(txHashAgain).toBeUndefined()

        // remove link
        const tx_remove = await alice.removeLink(
            alice.provider.wallet,
            await metamaskWallet.getAddress(),
        )
        const txHashRemove = await getTransactionHashFromTransactionOrUserOp(tx_remove.transaction)
        if (txHashRemove) {
            await alice.opts.baseProvider?.waitForTransaction(txHashRemove)
        }

        expect(tx_remove.error).toBeUndefined()

        // link with bob now
        const tx_link_again_bob = await bob.linkEOAToRootKey(bob.provider.wallet, metamaskWallet)
        const txHashAgainBob = await getTransactionHashFromTransactionOrUserOp(
            tx_link_again_bob.transaction,
        )
        if (txHashAgainBob) {
            await alice.opts.baseProvider?.waitForTransaction(txHashAgainBob)
        }
        expect(tx_link_again_bob.error).toBeUndefined()

        // check that the wallet is linked
        const bob_wallets = await bob.getLinkedWallets(bobAddress)
        expect(bob_wallets).toContain(await metamaskWallet.getAddress())
        expect((await bob.provider.getBalance(metamaskWallet.address)).toNumber()).toBe(0)
    })

    // in this test the caller needs funds to link the wallet
    test('link wallet using linkCallerToRootKey', async () => {
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        const metamaskProvider = new TownsTestWeb3Provider()
        const metamaskWallet = metamaskProvider.wallet

        await metamaskProvider.fundWallet()

        // alice must have funds to link the wallet
        const tx_link = await alice.linkCallerToRootKey(alice.provider.wallet, metamaskWallet)
        const txHash = await getTransactionHashFromTransactionOrUserOp(tx_link.transaction)

        if (txHash) {
            await alice.opts.baseProvider?.waitForTransaction(txHash)
        }
        expect(tx_link.error).toBeUndefined()
        expect(txHash).toBeDefined()

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
        const tx_link_again = await bob.linkCallerToRootKey(bob.provider.wallet, metamaskWallet)
        const txHashAgain = await getTransactionHashFromTransactionOrUserOp(
            tx_link_again.transaction,
        )

        if (txHashAgain) {
            await alice.opts.baseProvider?.waitForTransaction(txHashAgain)
        }

        expect(tx_link_again.error).toBeDefined()
        expect(tx_link_again.error?.name).toBe('WalletLink__LinkAlreadyExists')
        expect(txHashAgain).toBeUndefined()

        // remove link
        const tx_remove = await alice.removeLink(
            alice.provider.wallet,
            await metamaskWallet.getAddress(),
        )
        const txHashRemove = await getTransactionHashFromTransactionOrUserOp(tx_remove.transaction)
        if (txHashRemove) {
            await alice.opts.baseProvider?.waitForTransaction(txHashRemove)
        }

        expect(tx_remove.error).toBeUndefined()

        // link with bob now
        const tx_link_again_bob = await bob.linkCallerToRootKey(bob.provider.wallet, metamaskWallet)
        const txHashAgainBob = await getTransactionHashFromTransactionOrUserOp(
            tx_link_again_bob.transaction,
        )
        if (txHashAgainBob) {
            await alice.opts.baseProvider?.waitForTransaction(txHashAgainBob)
        }
        expect(tx_link_again_bob.error).toBeUndefined()

        // check that the wallet is linked
        const bob_wallets = await bob.getLinkedWallets(bobAddress)
        expect(bob_wallets).toContain(await metamaskWallet.getAddress())
    })

    // see note at bottom of test
    test.skip('link join wallet', async () => {
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        const metamaskWallet = await TestConstants.getWalletWithTestGatingNft()

        const tx_link = await bob.linkEOAToRootKey(bob.provider.wallet, metamaskWallet)
        const txHash = await getTransactionHashFromTransactionOrUserOp(tx_link.transaction)
        if (txHash) {
            await alice.opts.baseProvider?.waitForTransaction(txHash)
        }
        expect(tx_link.error).toBeUndefined()
        expect(txHash).toBeDefined()

        const bobAddress = bob.getUserId()
        await alice.fundWallet()
        await bob.fundWallet()

        // check that the wallet is linked
        const wallets = await bob.getLinkedWallets(bobAddress!)
        expect(wallets).toContain(await metamaskWallet.getAddress())

        const spaceId = await createTestSpaceGatedByTownsNfts(alice, [
            Permission.Read,
            Permission.Write,
        ])

        const joinTx = await alice.spaceDapp.joinSpace(
            spaceId!,
            metamaskWallet.address,
            alice.wallet,
        )

        if (joinTx?.hash) {
            await alice.opts.baseProvider?.waitForTransaction(joinTx?.hash)
        }

        const isEntitledToSpace = await bob.isEntitled(
            spaceId,
            undefined,
            bob.wallet.address,
            Permission.JoinSpace,
        )
        expect(isEntitledToSpace).toBeTruthy()

        // ES: 12/11/23 for this to work the contract check for joinSpace needs to change
        const bobJoinTx = await bob.spaceDapp.joinSpace(
            spaceId!,
            metamaskWallet.address,
            bob.wallet,
        )

        expect(bobJoinTx).toBeTruthy()
    })
})
