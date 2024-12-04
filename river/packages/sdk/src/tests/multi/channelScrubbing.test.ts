/**
 * @group with-entitlements
 */

import { MembershipOp } from '@river-build/proto'
import { makeUserStreamId } from '../../id'
import {
    getNftRuleData,
    linkWallets,
    unlinkWallet,
    setupChannelWithCustomRole,
    expectUserCanJoinChannel,
    waitFor,
} from '../testUtils'
import { dlog } from '@river-build/dlog'
import { Address, TestERC721 } from '@river-build/web3'

const log = dlog('csb:test:channelsWithEntitlements')

describe('channelScrubbing', () => {
    test('User who loses entitlements is bounced after a channel scrub is triggered', async () => {
        const TestNftName = 'TestNFT'
        const TestNftAddress = await TestERC721.getContractAddress(TestNftName)
        const {
            alice,
            bob,
            aliceSpaceDapp,
            aliceProvider,
            carolsWallet: alicesLinkedWallet,
            carolProvider: alicesLinkedProvider,
            spaceId,
            channelId,
        } = await setupChannelWithCustomRole([], getNftRuleData(TestNftAddress))

        // Link carol's wallet to alice's as root
        await linkWallets(aliceSpaceDapp, aliceProvider.wallet, alicesLinkedProvider.wallet)

        // Mint the needed asset to Alice's linked wallet
        log('Minting an NFT to alices linked wallet')
        await TestERC721.publicMint(TestNftName, alicesLinkedWallet.address as Address)

        // Join alice to the channel based on her linked wallet credentials
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        await unlinkWallet(aliceSpaceDapp, aliceProvider.wallet, alicesLinkedProvider.wallet)

        // Wait 5 seconds so the channel stream will become eligible for scrubbing
        await new Promise((f) => setTimeout(f, 5000))

        // When bob's join event is added to the stream, it should trigger a scrub, and Alice
        // should be booted from the stream since she unlinked her entitled wallet.
        await expect(bob.joinStream(channelId!)).toResolve()

        const userStreamView = (await alice.waitForStream(makeUserStreamId(alice.userId))!).view
        // Wait for alice's user stream to have the leave event
        await waitFor(() => userStreamView.userContent.isMember(channelId!, MembershipOp.SO_LEAVE))
    })
})
