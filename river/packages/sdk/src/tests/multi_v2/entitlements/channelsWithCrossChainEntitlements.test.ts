/**
 * @group with-v2-entitlements
 * @description channel entitlement tests to run on v2 spaces only
 */

import {
    setupChannelWithCustomRole,
    expectUserCanJoinChannel,
    expectUserCannotJoinChannel,
    linkWallets,
    mockCrossChainCheckOp,
} from '../../testUtils'
import { dlog } from '@river-build/dlog'
import { Address, treeToRuleData, TestCrossChainEntitlement } from '@river-build/web3'

const log = dlog('csb:test:channelsWithCrossChainEntitlements')

describe('channelsWithCrossChainEntitlements', () => {
    test('cross chain entitlement gate pass', async () => {
        const idParam = 1n
        const contractName = 'TestCrossChain'
        const ruleData = treeToRuleData(await mockCrossChainCheckOp(contractName, idParam))

        const { alice, bob, alicesWallet, aliceSpaceDapp, spaceId, channelId } =
            await setupChannelWithCustomRole([], ruleData)

        await TestCrossChainEntitlement.setIsEntitled(
            contractName,
            alicesWallet.address as Address,
            idParam,
            true,
        )

        log('expect that alice can join the channel')
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        // kill the clients
        const doneStart = Date.now()
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('cross chain entitlement gate fail', async () => {
        const idParam = 1n
        const contractName = 'TestCrossChain'
        const ruleData = treeToRuleData(await mockCrossChainCheckOp(contractName, idParam))

        const { alice, bob, alicesWallet, aliceSpaceDapp, spaceId, channelId } =
            await setupChannelWithCustomRole([], ruleData)

        await TestCrossChainEntitlement.setIsEntitled(
            contractName,
            alicesWallet.address as Address,
            idParam,
            false,
        )

        log('expect that alice cannot join the channel')
        await expectUserCannotJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        // kill the clients
        const doneStart = Date.now()
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('cross chain entitlement gate join pass - join as root, linked wallet entitled', async () => {
        const idParam = 1n
        const contractName = 'TestCrossChain'
        const ruleData = treeToRuleData(await mockCrossChainCheckOp(contractName, idParam))

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

        log('expect that alice cannot join the channel')
        await expectUserCannotJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        // Set entitlement for carol's wallet
        await TestCrossChainEntitlement.setIsEntitled(
            contractName,
            carolsWallet.address as Address,
            idParam,
            true,
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

    test('cross chain entitlement gated join - join as linked wallet, assets in root wallet', async () => {
        const idParam = 1n
        const contractName = 'TestCrossChain'
        const ruleData = treeToRuleData(await mockCrossChainCheckOp(contractName, idParam))

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

        // Set carol's wallet as entitled
        await TestCrossChainEntitlement.setIsEntitled(
            contractName,
            carolsWallet.address as Address,
            idParam,
            true,
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
})
