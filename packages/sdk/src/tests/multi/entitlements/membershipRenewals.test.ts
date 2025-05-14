/**
 * @group with-entitlements
 */

import {
    createTownWithRequirements,
    expectUserCanJoin,
    expectUserCanJoinChannel,
    getXchainConfigForTesting,
    linkWallets,
    waitFor,
} from '../../testUtils'
import { NoopRuleData } from '@towns-protocol/web3'
import { makeUserStreamId } from '../../../id'
import { MembershipOp } from '@towns-protocol/proto'
import { ethers } from 'ethers'

const SHORT_MEMBERSHIP_DURATION = 10 // seconds
const WAIT_TIME = SHORT_MEMBERSHIP_DURATION * 1_000 + 1_000

describe('membershipRenewals', () => {
    test('expired membership is not allowed to join', async () => {
        const { spaceId, channelId, alice, bob, aliceSpaceDapp, aliceProvider, alicesWallet } =
            await createTownWithRequirements({
                everyone: true,
                users: [],
                ruleData: NoopRuleData,
                duration: SHORT_MEMBERSHIP_DURATION,
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

        // wait for membership to expire
        await new Promise((resolve) => setTimeout(resolve, WAIT_TIME))
        await alice.leaveStream(spaceId)

        // space dapp does not check expiration, so we'll still get an entitled wallet
        const entitledWallet = await aliceSpaceDapp.getEntitledWalletForJoiningSpace(
            spaceId,
            alicesWallet.address,
            getXchainConfigForTesting(),
        )
        expect(entitledWallet).toBeDefined()
        // same here
        const hasMembership = await aliceSpaceDapp.hasSpaceMembership(spaceId, entitledWallet!)
        expect(hasMembership).toBe(true)

        await expect(alice.joinStream(spaceId)).rejects.toThrow(/7:PERMISSION_DENIED/)
        // Clean up
        await alice.stopSync()
        await bob.stopSync()
    })

    test('user with expired membership is bounced from a channel after scrub is triggered', async () => {
        const {
            spaceId,
            channelId,
            alice,
            carol,
            aliceSpaceDapp,
            aliceProvider,
            alicesWallet,
            carolSpaceDapp,
            carolProvider,
            carolsWallet,
        } = await createTownWithRequirements({
            everyone: true,
            users: [],
            ruleData: NoopRuleData,
            duration: SHORT_MEMBERSHIP_DURATION,
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

        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId)
        // Wait for membership to expire (and for channel to be eligible for scrubbing)
        await new Promise((f) => setTimeout(f, WAIT_TIME))

        await expectUserCanJoin(
            spaceId,
            channelId,
            'carol',
            carol,
            carolSpaceDapp,
            carolsWallet.address,
            carolProvider.wallet,
        )
        // When bob's join event is added to the stream, it should trigger a scrub, and Alice
        // should be booted from the stream since her membership has expired
        await expect(carol.joinStream(channelId)).resolves.not.toThrow()
        const userStreamView = (await alice.waitForStream(makeUserStreamId(alice.userId))).view

        // Wait for alice's user stream to have the leave event
        await waitFor(async () => {
            return expect(
                userStreamView.userContent.isMember(channelId, MembershipOp.SO_LEAVE),
            ).toBe(true)
        })

        // Clean up
        await alice.stopSync()
        await carol.stopSync()
    })

    test('user with unexpired membership is not bounced from a channel after scrub is triggered', async () => {
        const {
            spaceId,
            channelId,
            alice,
            carol,
            aliceSpaceDapp,
            aliceProvider,
            alicesWallet,
            carolSpaceDapp,
            carolProvider,
            carolsWallet,
        } = await createTownWithRequirements({
            everyone: true,
            users: [],
            ruleData: NoopRuleData,
            duration: SHORT_MEMBERSHIP_DURATION,
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

        // link a wallet to alice
        const eoaWallet = ethers.Wallet.createRandom()
        await linkWallets(aliceSpaceDapp, aliceProvider.wallet, eoaWallet)

        // have alice join the channel
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId)

        // Wait for membership to expire (and for channel to be eligible for scrubbing)
        await new Promise((f) => setTimeout(f, WAIT_TIME))

        // make sure this membership has expired
        const space = aliceSpaceDapp.getSpace(spaceId)
        const tokenId = await aliceSpaceDapp.getTokenIdOfOwner(spaceId, alicesWallet.address)
        const expiresAt = await space?.Membership.read.expiresAt(tokenId!)
        const expiresAtTimestamp = expiresAt?.toNumber() || 0
        const now = new Date()
        const timeUntilExpiration = (expiresAtTimestamp * 1000 - now.getTime()) / 1000
        expect(timeUntilExpiration).toBeLessThan(0)

        // now mint a membership for the eoa wallet, which is linked to alice - mint only, not joining stream
        await aliceSpaceDapp.joinSpace(spaceId, eoaWallet.address, aliceProvider.wallet)

        await expectUserCanJoin(
            spaceId,
            channelId,
            'carol',
            carol,
            carolSpaceDapp,
            carolsWallet.address,
            carolProvider.wallet,
        )
        // When bob's join event is added to the stream, it should trigger a scrub, and Alice
        // should be booted from the stream since her membership has expired
        await expect(carol.joinStream(channelId)).resolves.not.toThrow()
        const userStreamView = (await alice.waitForStream(makeUserStreamId(alice.userId))).view

        // wait for any caches to be invalidated
        await new Promise((f) => setTimeout(f, 5_000))

        // Wait for alice's user stream to have the leave event
        expect(userStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN)).toBe(true)

        // Clean up
        await alice.stopSync()
        await carol.stopSync()
    })
})
