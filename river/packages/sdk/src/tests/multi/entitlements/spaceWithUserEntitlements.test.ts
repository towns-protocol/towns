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
} from '../../testUtils'
import { dlog } from '@river-build/dlog'
import { NoopRuleData } from '@river-build/web3'

const log = dlog('csb:test:spaceWithUserEntitlements')

describe('spaceWithUserEntitlements', () => {
    test('user entitlement pass', async () => {
        const { alice, bob, aliceSpaceDapp, aliceProvider, alicesWallet, spaceId, channelId } =
            await createTownWithRequirements({
                everyone: false,
                users: ['alice'],
                ruleData: NoopRuleData,
            })

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

    test('user entitlement fail', async () => {
        const { alice, bob, aliceSpaceDapp, alicesWallet, aliceProvider, spaceId } =
            await createTownWithRequirements({
                everyone: false,
                users: ['carol'], // not alice!
                ruleData: NoopRuleData,
            })

        // Alice cannot join the space in the contract.
        const { issued } = await aliceSpaceDapp.joinSpace(
            spaceId,
            alicesWallet.address,
            aliceProvider.wallet,
        )
        expect(issued).toBe(false)

        // Have alice create a user stream attached to her own space.
        // Then she will attempt to join the space from the client, which should also fail.
        await createUserStreamAndSyncClient(
            alice,
            aliceSpaceDapp,
            'alice',
            await everyoneMembershipStruct(aliceSpaceDapp, alice),
            aliceProvider.wallet,
        )

        // Alice cannot join the space on the stream node.
        await expectUserCannotJoinSpace(spaceId, alice, aliceSpaceDapp, alicesWallet.address)

        // Kill the clients
        const doneStart = Date.now()
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    // This test is commented out as the membership joinSpace does not check linked wallets
    // against the user entitlement.
    test('user entitlement pass - join as root, linked wallet whitelisted', async () => {
        const {
            alice,
            bob,
            aliceSpaceDapp,
            alicesWallet,
            aliceProvider,
            carolProvider,
            spaceId,
            channelId,
        } = await createTownWithRequirements({
            everyone: false,
            users: ['carol'], // not alice!
            ruleData: NoopRuleData,
        })
        await linkWallets(aliceSpaceDapp, aliceProvider.wallet, carolProvider.wallet)

        // Alice should be able to join the space on the stream node.
        log('Alice should be able to join space', spaceId)
        await expectUserCanJoin(
            spaceId,
            channelId,
            'alice',
            alice,
            aliceSpaceDapp,
            alicesWallet.address,
            aliceProvider.wallet,
        )

        // Kill the clients
        const doneStart = Date.now()
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    // This test is commented out as the membership joinSpace does not check linked wallets
    // against the user entitlement.
    test('user entitlement pass - join as linked wallet, root wallet whitelisted', async () => {
        const {
            alice,
            bob,
            aliceSpaceDapp,
            carolSpaceDapp,
            aliceProvider,
            alicesWallet,
            carolProvider,
            spaceId,
            channelId,
        } = await createTownWithRequirements({
            everyone: false,
            users: ['carol'], // not alice!
            ruleData: NoopRuleData,
        })

        await linkWallets(carolSpaceDapp, carolProvider.wallet, aliceProvider.wallet)

        // Alice should be able to join the space on the stream node.
        log('Alice should be able to join space', spaceId)
        await expectUserCanJoin(
            spaceId,
            channelId,
            'alice',
            alice,
            aliceSpaceDapp,
            alicesWallet.address,
            aliceProvider.wallet,
        )

        // Kill the clients
        const doneStart = Date.now()
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })
})
