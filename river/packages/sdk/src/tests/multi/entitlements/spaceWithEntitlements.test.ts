/**
 * @group with-entitlements
 */

import {
    createTownWithRequirements,
    everyoneMembershipStruct,
    expectUserCanJoin,
    getXchainConfigForTesting,
    setupWalletsAndContexts,
    waitFor,
    createRole,
    createSpaceAndDefaultChannel,
} from '../../testUtils'
import { dlog } from '@river-build/dlog'
import { MembershipOp } from '@river-build/proto'
import { NoopRuleData, Permission } from '@river-build/web3'

const log = dlog('csb:test:spaceWithEntitlements')

describe('spaceWithEntitlements', () => {
    test('banned user not entitled to join space', async () => {
        const {
            alice,
            alicesWallet,
            aliceSpaceDapp,
            bob,
            bobSpaceDapp,
            bobProvider,
            spaceId,
            channelId,
        } = await createTownWithRequirements({
            everyone: true,
            users: [],
            ruleData: NoopRuleData,
        })

        // Have alice join the space so we can ban her
        await expectUserCanJoin(
            spaceId,
            channelId,
            'alice',
            alice,
            aliceSpaceDapp,
            alicesWallet.address,
            bobProvider.wallet,
        )

        const tx = await bobSpaceDapp.banWalletAddress(
            spaceId,
            alicesWallet.address,
            bobProvider.wallet,
        )
        await tx.wait()

        // Wait 2 seconds for the banning cache to expire on the stream node
        await new Promise((f) => setTimeout(f, 2000))

        // Alice no longer satisfies space entitlements
        const entitledWallet = await aliceSpaceDapp.getEntitledWalletForJoiningSpace(
            spaceId,
            alicesWallet.address,
            getXchainConfigForTesting(),
        )
        expect(entitledWallet).toBeUndefined()

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    // Banning with entitlements — users need permission to ban other users.
    test('owner can ban other users', async () => {
        log('start ownerCanBanOtherUsers')
        const {
            alice,
            bob,
            aliceSpaceDapp,
            aliceProvider,
            alicesWallet,
            spaceId,
            channelId,
            bobUserStreamView,
        } = await createTownWithRequirements({
            everyone: true,
            users: [],
            ruleData: NoopRuleData,
        })

        log('Alice should be able to join space')
        await expectUserCanJoin(
            spaceId,
            channelId,
            'alice',
            alice,
            aliceSpaceDapp,
            alicesWallet.address,
            aliceProvider.wallet,
        )

        // Alice cannot kick Bob
        log('Alice cannot kick bob')
        await expect(alice.removeUser(spaceId, bob.userId)).rejects.toThrow(/7:PERMISSION_DENIED/)

        // Bob is still a a member — Alice can't kick him because he's the owner
        await waitFor(() => {
            expect(bobUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(true)
            expect(bobUserStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN)).toBe(
                true,
            )
        })

        // Bob kicks Alice!
        log('Bob kicks Alice')
        await expect(bob.removeUser(spaceId, alice.userId)).resolves.not.toThrow()

        // Alice is no longer a member of the space or channel
        log('Alice is no longer a member of the space or channel')
        const aliceUserStreamView = alice.stream(alice.userStreamId!)!.view
        await waitFor(() => {
            expect(aliceUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(
                false,
            )
            expect(aliceUserStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN)).toBe(
                false,
            )
        })

        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done')
    })

    test('user with banning permission can ban other users', async () => {
        log('start user with banning permission can ban other users')
        const {
            bob,
            bobProvider,
            bobSpaceDapp,
            alice,
            aliceSpaceDapp,
            aliceProvider,
            alicesWallet,
            carol,
            carolsWallet,
            carolProvider,
            carolSpaceDapp,
        } = await setupWalletsAndContexts()

        const everyoneMembership = await everyoneMembershipStruct(bobSpaceDapp, bob)

        const { spaceId, defaultChannelId: channelId } = await createSpaceAndDefaultChannel(
            bob,
            bobSpaceDapp,
            bobProvider.wallet,
            "bob's town",
            everyoneMembership,
        )

        log('Alice should be able to join space')
        await expectUserCanJoin(
            spaceId,
            channelId,
            'alice',
            alice,
            aliceSpaceDapp,
            alicesWallet.address,
            aliceProvider.wallet,
        )
        await expectUserCanJoin(
            spaceId,
            channelId,
            'carol',
            carol,
            carolSpaceDapp,
            carolsWallet.address,
            carolProvider.wallet,
        )

        // Alice cannot kick Carol yet
        log('Alice cannot kick Carol')
        await expect(alice.removeUser(spaceId, carol.userId)).rejects.toThrow(/7:PERMISSION_DENIED/)

        let carolUserStreamView = carol.stream(carol.userStreamId!)!.view
        // Carol is still a member
        await waitFor(() => {
            expect(carolUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(
                true,
            )
            expect(carolUserStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN)).toBe(
                true,
            )
        })

        // Create an admin role for Alice that has permission to modify banning
        const { error: roleError } = await createRole(
            bobSpaceDapp,
            bobProvider,
            spaceId,
            'admin role',
            [Permission.ModifyBanning],
            [alice.userId],
            NoopRuleData,
            bobProvider.wallet,
        )
        expect(roleError).toBeUndefined()
        // Wait 2 seconds for the banning cache to expire on the stream node
        await new Promise((f) => setTimeout(f, 2000))

        log('Alice kicks Carol')
        await expect(alice.removeUser(spaceId, carol.userId)).resolves.not.toThrow()

        log('Carol is no longer a member of the space or channel')
        carolUserStreamView = carol.stream(carol.userStreamId!)!.view
        await waitFor(() => {
            expect(carolUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(
                false,
            )
            expect(carolUserStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN)).toBe(
                false,
            )
        })

        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        await carol.stopSync()
        log('Done')
    })
})
