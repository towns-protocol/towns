/**
 * @group with-entitlements
 */

import {
    createTownWithRequirements,
    createUserStreamAndSyncClient,
    everyoneMembershipStruct,
    expectUserCannotJoinSpace,
    expectUserCanJoin,
    linkWallets,
    ethBalanceCheckOp,
    oneEth,
    oneHalfEth,
    threeEth,
    twoEth,
} from '../../testUtils'
import { dlog } from '@river-build/dlog'
import { Address, TestEthBalance, treeToRuleData } from '@river-build/web3'

const log = dlog('csb:test:spaceWithEthBalanceEntitlements')

describe('spaceWithEthBalanceEntitlements', () => {
    test('eth balance gated join pass', async () => {
        const ruleData = treeToRuleData(ethBalanceCheckOp(oneEth))

        const { alice, bob, aliceSpaceDapp, aliceProvider, alicesWallet, spaceId, channelId } =
            await createTownWithRequirements({
                everyone: false,
                users: [],
                ruleData,
            })

        await TestEthBalance.setBaseBalance(alicesWallet.address as Address, twoEth)

        await expectUserCanJoin(
            spaceId,
            channelId,
            'alice',
            alice,
            aliceSpaceDapp,
            alicesWallet.address,
            aliceProvider.wallet,
        )

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('eth balance gated join pass - across networks', async () => {
        const ruleData = treeToRuleData(ethBalanceCheckOp(twoEth))

        const { alice, bob, aliceSpaceDapp, aliceProvider, alicesWallet, spaceId, channelId } =
            await createTownWithRequirements({
                everyone: false,
                users: [],
                ruleData,
            })

        await Promise.all([
            // Overprovision alice's wallet to pay for membership, gas fees for joining town
            TestEthBalance.setBaseBalance(alicesWallet.address as Address, oneEth + oneHalfEth),
            TestEthBalance.setRiverBalance(alicesWallet.address as Address, oneEth),
        ])

        await expectUserCanJoin(
            spaceId,
            channelId,
            'alice',
            alice,
            aliceSpaceDapp,
            alicesWallet.address,
            aliceProvider.wallet,
        )

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('eth balance gated join fail', async () => {
        const ruleData = treeToRuleData(ethBalanceCheckOp(oneEth))

        const { alice, bob, aliceSpaceDapp, aliceProvider, alicesWallet, spaceId } =
            await createTownWithRequirements({
                everyone: false,
                users: [],
                ruleData,
            })

        // Explicitly set alice's balance to not enough, but not zero, since she has to pay to join
        // the town.
        await TestEthBalance.setBaseBalance(alicesWallet.address as Address, oneHalfEth)

        // Have alice create her own space so she can initialize her user stream.
        // Then she will attempt to join the space from the client, which should fail
        // for permissions reasons.
        await createUserStreamAndSyncClient(
            alice,
            aliceSpaceDapp,
            'alice',
            await everyoneMembershipStruct(aliceSpaceDapp, alice),
            aliceProvider.wallet,
        )

        await expectUserCannotJoinSpace(spaceId, alice, aliceSpaceDapp, alicesWallet.address)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('eth balance gated join pass - join as root, linked wallet entitled', async () => {
        const ruleData = treeToRuleData(ethBalanceCheckOp(threeEth))
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
        } = await createTownWithRequirements({
            everyone: false,
            users: [],
            ruleData,
        })

        // Link carol's wallet to alice's as root
        await linkWallets(aliceSpaceDapp, aliceProvider.wallet, carolProvider.wallet)

        // Setting Carol's cumulative balance to 3ETH
        await Promise.all([
            // Overprovision alice's wallet to pay for membership, gas fees for joining town
            TestEthBalance.setBaseBalance(alicesWallet.address as Address, oneHalfEth),
            TestEthBalance.setRiverBalance(carolsWallet.address as Address, oneEth),
            TestEthBalance.setBaseBalance(carolsWallet.address as Address, twoEth),
        ])

        // Validate alice can join the space
        await expectUserCanJoin(
            spaceId,
            channelId,
            'alice',
            alice,
            aliceSpaceDapp,
            alicesWallet.address,
            aliceProvider.wallet,
        )

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
        } = await createTownWithRequirements({
            everyone: false,
            users: [],
            ruleData,
        })

        log("Joining alice's wallet as a linked wallet to carol's root wallet")
        await linkWallets(carolSpaceDapp, carolProvider.wallet, aliceProvider.wallet)

        log('Setting carol cumulative balance to 2ETH')
        await Promise.all([
            TestEthBalance.setBaseBalance(carolsWallet.address as Address, oneEth),
            TestEthBalance.setRiverBalance(carolsWallet.address as Address, oneEth),
            // Overprovision alice's wallet to pay for membership, gas fees for joining town
            TestEthBalance.setBaseBalance(alicesWallet.address as Address, oneHalfEth),
        ])

        log('expect that alice can join the space')
        // Validate alice can join the space
        await expectUserCanJoin(
            spaceId,
            channelId,
            'alice',
            alice,
            aliceSpaceDapp,
            alicesWallet.address,
            aliceProvider.wallet,
        )

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('eth balance gated join pass - assets must accumulate across wallets', async () => {
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
        } = await createTownWithRequirements({
            everyone: false,
            users: [],
            ruleData,
        })

        log("Joining alice's wallet as a linked wallet to carol's root wallet")
        await linkWallets(carolSpaceDapp, carolProvider.wallet, aliceProvider.wallet)

        log('Setting carol cumulative balance to 2ETH')
        await Promise.all([
            TestEthBalance.setBaseBalance(carolsWallet.address as Address, oneHalfEth),
            TestEthBalance.setRiverBalance(carolsWallet.address as Address, oneHalfEth),
            TestEthBalance.setBaseBalance(alicesWallet.address as Address, oneHalfEth),
            // Overprovision alice's wallet to pay for membership, gas fees for joining town
            TestEthBalance.setRiverBalance(alicesWallet.address as Address, oneEth),
        ])

        log('expect that alice can join the space')
        // Validate alice can join the space
        await expectUserCanJoin(
            spaceId,
            channelId,
            'alice',
            alice,
            aliceSpaceDapp,
            alicesWallet.address,
            aliceProvider.wallet,
        )

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('eth balance gate join fail - insufficient assets across wallets', async () => {
        const ruleData = treeToRuleData(ethBalanceCheckOp(threeEth))
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
        } = await createTownWithRequirements({
            everyone: false,
            users: [],
            ruleData,
        })
        // Link carol's wallet to alice's as root
        await linkWallets(aliceSpaceDapp, aliceProvider.wallet, carolProvider.wallet)

        // Set wallet balances to sum to < 3ETH but also be nonzero, as they have to pay to join the town.
        await Promise.all([
            TestEthBalance.setBaseBalance(carolsWallet.address as Address, oneHalfEth),
            TestEthBalance.setBaseBalance(alicesWallet.address as Address, oneHalfEth),
        ])

        // Have alice and carol create their own space so they can initialize their user streams.
        // Then they will attempt to join the space from the client, which should fail
        // for permissions reasons.
        await createUserStreamAndSyncClient(
            alice,
            aliceSpaceDapp,
            'alice',
            await everyoneMembershipStruct(aliceSpaceDapp, alice),
            aliceProvider.wallet,
        )
        await createUserStreamAndSyncClient(
            carol,
            carolSpaceDapp,
            'carol',
            await everyoneMembershipStruct(carolSpaceDapp, carol),
            carolProvider.wallet,
        )

        log('expect neither alice nor carol can join the space')
        await expectUserCannotJoinSpace(spaceId, alice, aliceSpaceDapp, alicesWallet.address)
        await expectUserCannotJoinSpace(spaceId, carol, carolSpaceDapp, carolsWallet.address)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })
})
