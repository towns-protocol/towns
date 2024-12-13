/**
 * @group with-entitlements
 */

import {
    linkWallets,
    setupChannelWithCustomRole,
    expectUserCanJoinChannel,
    expectUserCannotJoinChannel,
} from '../../testUtils'
import { dlog } from '@river-build/dlog'
import { NoopRuleData } from '@river-build/web3'

const log = dlog('csb:test:channelsWithUserEntitlements')

describe('channelsWithUserEntitlements', () => {
    test('userEntitlementPass', async () => {
        const { alice, bob, aliceSpaceDapp, spaceId, channelId } = await setupChannelWithCustomRole(
            ['alice'],
            NoopRuleData,
        )

        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('userEntitlementFail', async () => {
        const { alice, aliceSpaceDapp, bob, spaceId, channelId } = await setupChannelWithCustomRole(
            ['carol'],
            NoopRuleData,
        )

        await expectUserCannotJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('userEntitlementPass - join as root, linked wallet whitelisted', async () => {
        const { alice, aliceSpaceDapp, aliceProvider, carolProvider, bob, spaceId, channelId } =
            await setupChannelWithCustomRole(['carol'], NoopRuleData)

        // Link carol's wallet to alice's as root
        await linkWallets(aliceSpaceDapp, aliceProvider.wallet, carolProvider.wallet)

        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('userEntitlementPass - join as linked wallet, root wallet whitelisted', async () => {
        const {
            alice,
            aliceSpaceDapp,
            carolSpaceDapp,
            aliceProvider,
            carolProvider,
            bob,
            spaceId,
            channelId,
        } = await setupChannelWithCustomRole(['carol'], NoopRuleData)

        // Link alice's wallet to Carol's wallet as root
        await linkWallets(carolSpaceDapp, carolProvider.wallet, aliceProvider.wallet)

        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done linked-wallet-whitelist', Date.now() - doneStart)
    })
})
