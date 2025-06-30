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
import { MembershipOp, MembershipReason } from '@towns-protocol/proto'
import { ethers } from 'ethers'

const SHORT_MEMBERSHIP_DURATION = 20 // seconds
const WAIT_TIME = SHORT_MEMBERSHIP_DURATION * 1_000 + 500

// this test is long because it has to wait for the membership to expire in real time
// but the membership duration has to be long enough such that other actions/assertions can be made
// it tests both node entitlement checks for expired memberships, as well as client entitlement checks via space dapp

describe('membershipRenewals', () => {
    test.concurrent('expired membership is not allowed to join', async () => {
        const {
            spaceId,
            channelId,
            alice,
            bob,
            aliceSpaceDapp,
            aliceProvider,
            alicesWallet,
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

        // wait for membership to expire
        await new Promise((resolve) => setTimeout(resolve, WAIT_TIME))
        await alice.leaveStream(spaceId)

        const aliceWallets = await aliceSpaceDapp.getLinkedWallets(
            alicesWallet.address,
        )
        const membershipStatus = await aliceSpaceDapp.getMembershipStatus(
            spaceId,
            aliceWallets,
        )
        expect(membershipStatus.isMember).toBe(true)
        expect(membershipStatus.isExpired).toBe(true)
        const entitledWallet =
            await aliceSpaceDapp.getEntitledWalletForJoiningSpace(
                spaceId,
                alicesWallet.address,
                getXchainConfigForTesting(),
            )
        expect(entitledWallet).toBeUndefined()

        await expect(alice.joinStream(spaceId)).rejects.toThrow(
            /7:PERMISSION_DENIED/,
        )
        // Clean up
        await alice.stopSync()
        await bob.stopSync()
    })

    test.concurrent(
        'user with expired membership is bounced from a channel after scrub is triggered',
        async () => {
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

            await expectUserCanJoinChannel(
                alice,
                aliceSpaceDapp,
                spaceId,
                channelId,
            )
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
            // When carol's join event is added to the stream, it should trigger a scrub, and Alice
            // should be booted from the stream since her membership has expired
            await expect(carol.joinStream(channelId)).resolves.not.toThrow()
            const userStreamView = (
                await alice.waitForStream(makeUserStreamId(alice.userId))
            ).view
            const membership =
                userStreamView.userContent.getMembership(channelId)

            // Wait for alice's user stream to have the leave event
            await waitFor(async () => {
                expect(membership?.op).toBe(MembershipOp.SO_LEAVE)
                expect(membership?.reason).toBe(MembershipReason.MR_EXPIRED)
            })
            // Clean up
            await alice.stopSync()
            await carol.stopSync()
        },
    )

    test.concurrent(
        'user with unexpired membership is not bounced from a channel after scrub is triggered',
        async () => {
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
            await expectUserCanJoinChannel(
                alice,
                aliceSpaceDapp,
                spaceId,
                channelId,
            )

            // Wait for membership to expire (and for channel to be eligible for scrubbing)
            await new Promise((f) => setTimeout(f, WAIT_TIME))

            // make sure this membership has expired
            const space = aliceSpaceDapp.getSpace(spaceId)
            const tokenId = await aliceSpaceDapp.getTokenIdOfOwner(
                spaceId,
                alicesWallet.address,
            )
            const expiresAt = await space?.Membership.read.expiresAt(tokenId!)
            const expiresAtTimestamp = expiresAt?.toNumber() || 0
            const now = new Date()
            const timeUntilExpiration =
                (expiresAtTimestamp * 1000 - now.getTime()) / 1000
            expect(timeUntilExpiration).toBeLessThan(0)

            // now mint a membership for the eoa wallet, which is linked to alice - mint only, not joining stream
            await aliceSpaceDapp.joinSpace(
                spaceId,
                eoaWallet.address,
                aliceProvider.wallet,
            )

            const aliceWallets = await aliceSpaceDapp.getLinkedWallets(
                alicesWallet.address,
            )
            const membershipStatus = await aliceSpaceDapp.getMembershipStatus(
                spaceId,
                aliceWallets,
            )
            expect(membershipStatus.isMember).toBe(true)
            expect(membershipStatus.isExpired).toBe(false)
            const entitledWallet =
                await aliceSpaceDapp.getEntitledWalletForJoiningSpace(
                    spaceId,
                    alicesWallet.address,
                    getXchainConfigForTesting(),
                )
            expect(entitledWallet).toBeDefined()

            await expectUserCanJoin(
                spaceId,
                channelId,
                'carol',
                carol,
                carolSpaceDapp,
                carolsWallet.address,
                carolProvider.wallet,
            )
            // When carol's join event is added to the stream, it should trigger a scrub, and Alice
            // should not be booted from the stream since her she has an additional token that is not expired
            await expect(carol.joinStream(channelId)).resolves.not.toThrow()
            const userStreamView = (
                await alice.waitForStream(makeUserStreamId(alice.userId))
            ).view

            // Wait for alice's user stream to have the join event
            await waitFor(async () => {
                return expect(
                    userStreamView.userContent.isMember(
                        channelId,
                        MembershipOp.SO_JOIN,
                    ),
                ).toBe(true)
            })

            // Clean up
            await alice.stopSync()
            await carol.stopSync()
        },
    )

    test.concurrent('(BASE only) user can renew membership', async () => {
        const _MEMBERSHIP_DURATION = 10
        const { spaceId, aliceSpaceDapp, aliceProvider, alicesWallet } =
            await createTownWithRequirements({
                everyone: true,
                users: [],
                ruleData: NoopRuleData,
                duration: _MEMBERSHIP_DURATION,
            })

        // Check that the local evaluation of the user's entitlements for joining the space
        // passes.
        const entitledWallet =
            await aliceSpaceDapp.getEntitledWalletForJoiningSpace(
                spaceId,
                alicesWallet.address,
                getXchainConfigForTesting(),
            )
        expect(entitledWallet).toBeDefined()

        const { issued } = await aliceSpaceDapp.joinSpace(
            spaceId,
            alicesWallet.address,
            aliceProvider.wallet,
        )
        expect(issued).toBe(true)

        // wait for membership to expire
        await new Promise((resolve) =>
            setTimeout(resolve, _MEMBERSHIP_DURATION * 1_000 + 500),
        )

        const aliceWallets = await aliceSpaceDapp.getLinkedWallets(
            alicesWallet.address,
        )
        const membershipStatus = await aliceSpaceDapp.getMembershipStatus(
            spaceId,
            aliceWallets,
        )
        expect(membershipStatus.isMember).toBe(true)
        expect(membershipStatus.isExpired).toBe(true)
        const entitledWalletAfterExpiry =
            await aliceSpaceDapp.getEntitledWalletForJoiningSpace(
                spaceId,
                alicesWallet.address,
                getXchainConfigForTesting(),
            )
        expect(entitledWalletAfterExpiry).toBeUndefined()

        const space = aliceSpaceDapp.getSpace(spaceId)

        const tokenId = membershipStatus.tokenId
        expect(tokenId).toBeDefined()

        if (!tokenId || !space) {
            throw new Error('TokenId or space not found')
        }

        const tx = await space.renewMembership({
            tokenId,
            signer: aliceProvider.wallet,
        })
        const receipt = await tx.wait()
        expect(receipt.status).toBe(1)

        const membershipStatusAfterRenewal =
            await space.getMembershipStatus(aliceWallets)
        expect(membershipStatusAfterRenewal.isMember).toBe(true)
        expect(membershipStatusAfterRenewal.isExpired).toBe(false)

        // wait for caches to be invalidated
        await new Promise((resolve) => setTimeout(resolve, 5_000))

        const entitledWalletAfterRenewal =
            await aliceSpaceDapp.getEntitledWalletForJoiningSpace(
                spaceId,
                alicesWallet.address,
                getXchainConfigForTesting(),
            )
        expect(entitledWalletAfterRenewal).toBeDefined()
    })
})
