import { TestConstants } from '../integration/helpers/TestConstants'
import { registerAndStartClient } from '../integration/helpers/TestUtils'
import { getAccountAbstractionConfig } from './testUtils'

/**
 *
 * // https://www.npmjs.com/package/jest-runner-groups
 * @group integration/userops
 */

const accountAbstractionConfig = getAccountAbstractionConfig()

// This test is skipped until WalletLink contract is updated so that the root key wallet is the one that makes the tx, not the external linked wallet
// that way the root key can pay for the userop
// we need either that or a wallet that contains eth for testing
test.skip('can join a space via userop and pass entitlement check to become a member', async () => {
    const alice = await registerAndStartClient('alice', TestConstants.getUnfundedWallet(), {
        accountAbstractionConfig,
    })
    const metamaskWallet = await TestConstants.getUnfundedWallet()

    await alice.linkWallet(alice.wallet, metamaskWallet)

    const aliceWallets = await alice.getLinkedWallets(alice.getUserId()!)
    expect(aliceWallets).toContain(await metamaskWallet.getAddress())
})
