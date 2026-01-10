/**
 * @group with-entitlements
 */

import {
    linkWallets,
    setupChannelWithCustomRole,
    expectUserCanJoinChannel,
    expectUserCannotJoinChannel,
    ethBalanceCheckOp,
} from '../../testUtils'
import { dlog } from '@towns-protocol/utils'
import { Address, TestEthBalance, treeToRuleData } from '@towns-protocol/web3'

const log = dlog('csb:test:channelsWithEthBalanceEntitlements')
const oneHalfEth = BigInt(5e17)
const oneEth = oneHalfEth * BigInt(2)
const twoEth = oneEth * BigInt(2)
const gtTwoEth = twoEth + BigInt(1)

describe('channelsWithEthBalanceEntitlements', () => {
    test('eth balance gate pass', async () => {
        const ruleData = treeToRuleData(ethBalanceCheckOp(oneEth))

        const { alice, bob, alicesWallet, aliceSpaceDapp, spaceId, channelId } =
            await setupChannelWithCustomRole([], ruleData)

        await TestEthBalance.setBaseBalance(alicesWallet.address as Address, oneEth)

        log('expect that alice can join the channel')
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        // kill the clients
        const doneStart = Date.now()
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('eth balance gate pass - across networks', async () => {
        const ruleData = treeToRuleData(ethBalanceCheckOp(oneEth))

        const { alice, bob, alicesWallet, aliceSpaceDapp, spaceId, channelId } =
            await setupChannelWithCustomRole([], ruleData)

        await Promise.all([
            TestEthBalance.setBaseBalance(alicesWallet.address as Address, oneHalfEth),
            TestEthBalance.setRiverBalance(alicesWallet.address as Address, oneHalfEth),
        ])

        log('expect that alice can join the channel')
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        // kill the clients
        const doneStart = Date.now()
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('eth balance gate fail', async () => {
        const ruleData = treeToRuleData(ethBalanceCheckOp(oneEth))

        const { alice, bob, alicesWallet, aliceSpaceDapp, spaceId, channelId } =
            await setupChannelWithCustomRole([], ruleData)

        // alice's base wallet may need to be explicitly set to zero to compensate for wallet funding in
        // initialization methods.
        await TestEthBalance.setBaseBalance(alicesWallet.address as Address, 0n)

        log('expect that alice cannot join the channel (has no ETH)')
        await expectUserCannotJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        // kill the clients
        const doneStart = Date.now()
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('eth balance gate join pass - join as root, linked wallet entitled', async () => {
        const ruleData = treeToRuleData(ethBalanceCheckOp(oneEth))
        const {
            alice,
            bob,
            aliceSpaceDapp,
            aliceProvider,
            carolsWallet,
            alicesWallet,
            carolProvider,
            spaceId,
            channelId,
        } = await setupChannelWithCustomRole([], ruleData)

        // Link carol's wallet to alice's as root
        await linkWallets(aliceSpaceDapp, aliceProvider.wallet, carolProvider.wallet)

        // Explicitly set wallet balances to 0
        await Promise.all([
            TestEthBalance.setBaseBalance(carolsWallet.address as Address, 0n),
            TestEthBalance.setBaseBalance(alicesWallet.address as Address, 0n),
        ])

        // Validate alice cannot join the channel
        await expectUserCannotJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        await Promise.all([
            TestEthBalance.setBaseBalance(carolsWallet.address as Address, oneHalfEth),
            TestEthBalance.setRiverBalance(carolsWallet.address as Address, oneHalfEth),
        ])

        // Wait 2 seconds for the negative auth cache to expire
        await new Promise((f) => setTimeout(f, 2000))

        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('eth balance gated join pass - join as linked wallet, assets in root wallet', async () => {
        const ruleData = treeToRuleData(ethBalanceCheckOp(twoEth))
        const {
            alice,
            bob,
            aliceSpaceDapp,
            carolSpaceDapp,
            aliceProvider,
            alicesWallet,
            carolsWallet,
            carolProvider,
            spaceId,
            channelId,
        } = await setupChannelWithCustomRole([], ruleData)

        log("Joining alice's wallet as a linked wallet to carol's root wallet")
        await linkWallets(carolSpaceDapp, carolProvider.wallet, aliceProvider.wallet)

        log("Setting carol and alice's wallet balances to 1ETH and 0, respectively")
        // Carol's cumulative balance across wallets: 2ETH
        // Alice's cumulative balance: 0
        await Promise.all([
            TestEthBalance.setBaseBalance(carolsWallet.address as Address, oneEth),
            TestEthBalance.setRiverBalance(carolsWallet.address as Address, oneEth),
            TestEthBalance.setBaseBalance(alicesWallet.address as Address, 0n),
        ])

        log('expect that alice can join the channel')
        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('eth balance gate join pass - assets across wallets and networks', async () => {
        const ruleData = treeToRuleData(ethBalanceCheckOp(twoEth))
        const {
            alice,
            bob,
            aliceSpaceDapp,
            aliceProvider,
            carolsWallet,
            alicesWallet,
            carolProvider,
            spaceId,
            channelId,
        } = await setupChannelWithCustomRole([], ruleData)

        // Link carol's wallet to alice's as root
        await linkWallets(aliceSpaceDapp, aliceProvider.wallet, carolProvider.wallet)

        // Set wallet balances to 0
        await Promise.all([
            TestEthBalance.setBaseBalance(carolsWallet.address as Address, oneHalfEth),
            TestEthBalance.setBaseBalance(alicesWallet.address as Address, oneHalfEth),
            TestEthBalance.setRiverBalance(carolsWallet.address as Address, oneHalfEth),
            TestEthBalance.setRiverBalance(alicesWallet.address as Address, oneHalfEth),
        ])

        // Validate alice can join the channel
        log('expect that alice can join the channel')
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('eth balance gate join fail - insufficient assets across wallets', async () => {
        const ruleData = treeToRuleData(ethBalanceCheckOp(gtTwoEth))
        const {
            alice,
            bob,
            carol,
            aliceSpaceDapp,
            carolSpaceDapp,
            aliceProvider,
            carolsWallet,
            alicesWallet,
            carolProvider,
            spaceId,
            channelId,
        } = await setupChannelWithCustomRole([], ruleData)

        // Link carol's wallet to alice's as root
        await linkWallets(aliceSpaceDapp, aliceProvider.wallet, carolProvider.wallet)

        // Set wallet balances to 0
        await Promise.all([
            TestEthBalance.setBaseBalance(carolsWallet.address as Address, oneHalfEth),
            TestEthBalance.setBaseBalance(alicesWallet.address as Address, oneHalfEth),
            TestEthBalance.setRiverBalance(carolsWallet.address as Address, oneHalfEth),
            TestEthBalance.setRiverBalance(alicesWallet.address as Address, oneHalfEth),
        ])

        log('expect neither alice nor carol can join the channel')
        await expectUserCannotJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)
        await expectUserCannotJoinChannel(carol, carolSpaceDapp, spaceId, channelId!)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })
})
