/**
 * @group with-entitlements
 */

import { MembershipOp, MembershipReason } from '@towns-protocol/proto'
import { makeUserStreamId } from '../../id'
import {
    getNftRuleData,
    linkWallets,
    unlinkWallet,
    setupChannelWithCustomRole,
    expectUserCanJoinChannel,
    waitFor,
} from '../testUtils'
import { dlog } from '@towns-protocol/dlog'
import { Address, TestERC721 } from '@towns-protocol/web3'
import { ethers } from 'ethers'
const log = dlog('csb:test:channelsWithEntitlements')

describe('channelScrubbing', () => {
    test('User who loses entitlements is bounced after a channel scrub is triggered', async () => {
        const TestNftName = 'TestNFT'
        const TestNftAddress = await TestERC721.getContractAddress(TestNftName)
        const {
            alice,
            aliceSpaceDapp,
            aliceProvider,
            carol,
            carolSpaceDapp,
            carolProvider,
            spaceId,
            channelId,
        } = await setupChannelWithCustomRole([], getNftRuleData(TestNftAddress))

        const aliceLinkedWallet = ethers.Wallet.createRandom()
        const carolLinkedWallet = ethers.Wallet.createRandom()

        // link wallets
        await Promise.all([
            linkWallets(
                aliceSpaceDapp,
                aliceProvider.wallet,
                aliceLinkedWallet,
            ),
            linkWallets(
                carolSpaceDapp,
                carolProvider.wallet,
                carolLinkedWallet,
            ),
        ])
        // Mint the needed asset to Alice and Carol's linked wallets
        log('Minting an NFT to alices linked wallet')
        await Promise.all([
            TestERC721.publicMint(
                TestNftName,
                aliceLinkedWallet.address as Address,
            ),
            TestERC721.publicMint(
                TestNftName,
                carolLinkedWallet.address as Address,
            ),
        ])

        // Join alice to the channel based on her linked wallet credentials
        await expectUserCanJoinChannel(
            alice,
            aliceSpaceDapp,
            spaceId,
            channelId!,
        )

        await unlinkWallet(
            aliceSpaceDapp,
            aliceProvider.wallet,
            aliceLinkedWallet,
        )

        // Wait 5 seconds so the channel stream will become eligible for scrubbing
        await new Promise((f) => setTimeout(f, 5000))

        // When carol's join event is added to the stream, it should trigger a scrub, and Alice
        // should be booted from the stream since she unlinked her entitled wallet.
        await expectUserCanJoinChannel(
            carol,
            carolSpaceDapp,
            spaceId,
            channelId!,
        )

        const userStreamView = (
            await alice.waitForStream(makeUserStreamId(alice.userId))
        ).view
        // Wait for alice's user stream to have the leave event
        await waitFor(() => {
            const membership = userStreamView.userContent.getMembership(
                channelId!,
            )
            expect(membership?.op).toBe(MembershipOp.SO_LEAVE)
            expect(membership?.reason).toBe(MembershipReason.MR_NOT_ENTITLED)
        })
    })
})
