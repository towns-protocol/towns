import { Address } from '../../src/types/web3-types'
import { TestConstants } from '../integration/helpers/TestConstants'
import { registerAndStartClient, waitForWithRetries } from '../integration/helpers/TestUtils'
import {
    generateRandomUnfundedOrPrivateKeyWallet,
    getAccountAbstractionConfig,
    isSmartAccountDeployed,
    sleepBetweenTxs,
} from './testUtils'

/**
 *
 * // https://www.npmjs.com/package/jest-runner-groups
 * @group integration/userops
 */

const accountAbstractionConfig = getAccountAbstractionConfig()

// This test is skipped until WalletLink contract is updated so that the root key wallet is the one that makes the tx, not the external linked wallet
// that way the root key can pay for the userop
// we need either that or a wallet that contains eth for testing
test('can link a wallet with unfunded EOA', async () => {
    const alice = await registerAndStartClient(
        'alice',
        generateRandomUnfundedOrPrivateKeyWallet(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
        {
            accountAbstractionConfig,
        },
    )
    const metamaskWallet = await TestConstants.getUnfundedWallet()
    const metamaskAddress = await metamaskWallet.getAddress()

    const tx = await alice.linkEOAToRootKey(alice.wallet, metamaskWallet)
    await alice.waitWalletLinkTransaction(tx)
    await waitForWithRetries(() => isSmartAccountDeployed(alice))
    await sleepBetweenTxs()

    const aliceWallets = await alice.getLinkedWallets(alice.getUserId()!)
    expect(aliceWallets).toContain(metamaskAddress)

    const unlinkTx = await alice.removeLink(alice.wallet, metamaskWallet.address)
    await alice.waitWalletLinkTransaction(unlinkTx)
    await sleepBetweenTxs()

    expect(await alice.getLinkedWallets(alice.getUserId()!)).not.toContain(metamaskAddress)
})

test('can link a smart account', async () => {
    const alice = await registerAndStartClient(
        'alice',
        generateRandomUnfundedOrPrivateKeyWallet(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
        {
            accountAbstractionConfig,
        },
    )
    const aliceAbstractAccountAddress = await alice.getAbstractAccountAddress({
        rootKeyAddress: alice.wallet.address as Address,
    })
    expect(aliceAbstractAccountAddress).toBeDefined()

    const aaAddress = aliceAbstractAccountAddress!

    // unlink aaAddress if previously linked
    if (process.env.PRIVY_WALLET_PRIVATE_KEY_1) {
        if ((await alice.getLinkedWallets(alice.getUserId()!)).includes(aaAddress)) {
            const unlinkTx = await alice.removeLink(alice.wallet, aaAddress)
            await alice.waitWalletLinkTransaction(unlinkTx)
            await sleepBetweenTxs()
        }
    }

    const tx = await alice.linkCallerToRootKey(alice.wallet)
    await alice.waitWalletLinkTransaction(tx)
    await waitForWithRetries(() => isSmartAccountDeployed(alice))
    await sleepBetweenTxs()

    const aliceWallets = await alice.getLinkedWallets(alice.getUserId()!)
    expect(aliceWallets).toContain(aaAddress)

    const unlinkTx = await alice.removeLink(alice.wallet, aaAddress)
    await alice.waitWalletLinkTransaction(unlinkTx)
    await sleepBetweenTxs()

    expect(await alice.getLinkedWallets(alice.getUserId()!)).not.toContain(aaAddress)
})
