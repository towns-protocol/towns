/**
 * @group with-entitlements
 */

import {
    linkWallets,
    erc20CheckOp,
    setupChannelWithCustomRole,
    expectUserCanJoinChannel,
    expectUserCannotJoinChannel,
} from '../../testUtils'
import { dlog } from '@river-build/dlog'
import { Address, TestERC20, treeToRuleData } from '@river-build/web3'

const log = dlog('csb:test:channelsWithErc20Entitlements')

describe('channelsWithErc20Entitlements', () => {
    test('erc20 gate join pass', async () => {
        const ruleData = treeToRuleData(await erc20CheckOp('TestERC20', 50n))

        const { alice, bob, alicesWallet, aliceSpaceDapp, spaceId, channelId } =
            await setupChannelWithCustomRole([], ruleData)

        await TestERC20.publicMint('TestERC20', alicesWallet.address as Address, 100)

        log('expect that alice can join the channel')
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        // kill the clients
        const doneStart = Date.now()
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('erc20 gate join fail', async () => {
        const ruleData = treeToRuleData(await erc20CheckOp('TestERC20', 50n))

        const { alice, bob, aliceSpaceDapp, spaceId, channelId } = await setupChannelWithCustomRole(
            [],
            ruleData,
        )

        log('expect that alice cannot join the channel')
        await expectUserCannotJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        // kill the clients
        const doneStart = Date.now()
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('erc20 gate join pass - join as root, asset in linked wallet', async () => {
        const ruleData = treeToRuleData(await erc20CheckOp('TestERC20', 50n))
        const {
            alice,
            bob,
            aliceSpaceDapp,
            aliceProvider,
            carolsWallet,
            carolProvider,
            spaceId,
            channelId,
        } = await setupChannelWithCustomRole([], ruleData)

        // Link carol's wallet to alice's as root
        await linkWallets(aliceSpaceDapp, aliceProvider.wallet, carolProvider.wallet)

        // Validate alice cannot join the channel
        await expectUserCannotJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        // Mint the needed asset to Alice's linked wallet
        log('Minting 50 ERC20 tokens for carols wallet, which is linked to alices wallet')
        await TestERC20.publicMint('TestERC20', carolsWallet.address as Address, 50)

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

    test('erc20 Gate Join Pass - join as linked wallet, assets in root wallet', async () => {
        const ruleData = treeToRuleData(await erc20CheckOp('TestERC20', 50n))
        const {
            alice,
            bob,
            aliceSpaceDapp,
            carolSpaceDapp,
            aliceProvider,
            carolsWallet,
            carolProvider,
            spaceId,
            channelId,
        } = await setupChannelWithCustomRole([], ruleData)

        log("Joining alice's wallet as a linked wallet to carols root wallet")
        await linkWallets(carolSpaceDapp, carolProvider.wallet, aliceProvider.wallet)

        log('Minting an NFT for carols wallet, which is the root to alices wallet')
        await TestERC20.publicMint('TestERC20', carolsWallet.address as Address, 50)

        log('expect that alice can join the channel')
        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('erc20 Gate Join Pass - assets split across wallets', async () => {
        const ruleData = treeToRuleData(await erc20CheckOp('TestERC20', 50n))
        const {
            alice,
            bob,
            aliceSpaceDapp,
            carolSpaceDapp,
            aliceProvider,
            carolsWallet,
            carolProvider,
            spaceId,
            channelId,
        } = await setupChannelWithCustomRole([], ruleData)

        log("Joining alice's wallet as a linked wallet to carol's root wallet")
        await linkWallets(carolSpaceDapp, carolProvider.wallet, aliceProvider.wallet)

        log("Minting an NFT for carol's wallet, which is the root to alice's wallet")
        await TestERC20.publicMint('TestERC20', carolsWallet.address as Address, 25)
        await TestERC20.publicMint('TestERC20', aliceProvider.wallet.address as Address, 25)

        log('expect that alice can join the space')
        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })
})
