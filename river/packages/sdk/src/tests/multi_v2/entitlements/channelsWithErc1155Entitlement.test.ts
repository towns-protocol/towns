/**
 * @group with-v2-entitlements
 * @description channel entitlement tests to run on v2 spaces only
 */

import {
    erc1155CheckOp,
    setupChannelWithCustomRole,
    expectUserCanJoinChannel,
    expectUserCannotJoinChannel,
    linkWallets,
} from '../../testUtils'
import { dlog } from '@river-build/dlog'
import { Address, treeToRuleData, TestERC1155 } from '@river-build/web3'

const log = dlog('csb:test:channelsWithErc1155Entitlements')
const test1155Name = 'TestERC1155'

describe('channelsWithErc1155Entitlements', () => {
    test('erc1155 gate join pass', async () => {
        const ruleData = treeToRuleData(
            await erc1155CheckOp(test1155Name, BigInt(TestERC1155.TestTokenId.Bronze), 1n),
        )

        const { alice, bob, alicesWallet, aliceSpaceDapp, spaceId, channelId } =
            await setupChannelWithCustomRole([], ruleData)

        log('Minting 1 Bronze ERC1155 token for alice')
        await TestERC1155.publicMint(
            test1155Name,
            alicesWallet.address as Address,
            TestERC1155.TestTokenId.Bronze,
        )

        log('expect that alice can join the channel')
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        // kill the clients
        const doneStart = Date.now()
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('erc1155 gate join fail', async () => {
        const ruleData = treeToRuleData(
            await erc1155CheckOp(test1155Name, BigInt(TestERC1155.TestTokenId.Bronze), 1n),
        )

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

    test('erc1155 gate join pass - join as root, asset in linked wallet', async () => {
        const ruleData = treeToRuleData(
            await erc1155CheckOp(test1155Name, BigInt(TestERC1155.TestTokenId.Bronze), 1n),
        )
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
        log('Minting 1 Bronze ERC1155 token for carols wallet, which is linked to alices wallet')
        await TestERC1155.publicMint(
            test1155Name,
            carolsWallet.address as Address,
            TestERC1155.TestTokenId.Bronze,
        )

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

    test('erc1155 Gate Join Pass - join as linked wallet, assets in root wallet', async () => {
        const ruleData = treeToRuleData(
            await erc1155CheckOp(test1155Name, BigInt(TestERC1155.TestTokenId.Bronze), 1n),
        )
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

        log('Minting 1 Bronze ERC1155 token for carols wallet, which is the root of alices wallet')
        await TestERC1155.publicMint(
            test1155Name,
            carolsWallet.address as Address,
            TestERC1155.TestTokenId.Bronze,
        )

        log('expect that alice can join the channel')
        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('erc1155 Gate Join Pass - assets split across wallets', async () => {
        const ruleData = treeToRuleData(
            await erc1155CheckOp(test1155Name, BigInt(TestERC1155.TestTokenId.Bronze), 2n),
        )
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

        log('Minting 1 Bronze ERC1155 token for each wallet')
        await TestERC1155.publicMint(
            test1155Name,
            carolsWallet.address as Address,
            TestERC1155.TestTokenId.Bronze,
        )
        await TestERC1155.publicMint(
            test1155Name,
            aliceProvider.wallet.address as Address,
            TestERC1155.TestTokenId.Bronze,
        )

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
