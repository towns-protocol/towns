/**
 * @group with-entitlements
 */

import {
    waitFor,
    getNftRuleData,
    setupChannelWithCustomRole,
    expectUserCanJoinChannel,
    expectUserCannotJoinChannel,
} from '../../testUtils'
import { MembershipOp } from '@river-build/proto'
import { Address, Permission, TestERC721 } from '@river-build/web3'
import { make_MemberPayload_KeySolicitation } from '../../../types'

describe('channelsWithEntitlementLoss', () => {
    test('user booted on key request after entitlement loss', async () => {
        const testNftAddress = await TestERC721.getContractAddress('TestNFT')
        const { alice, alicesWallet, aliceSpaceDapp, bob, spaceId, channelId } =
            await setupChannelWithCustomRole([], getNftRuleData(testNftAddress))

        // Mint an nft for alice - she should be able to join now
        const tokenId = await TestERC721.publicMint('TestNFT', alicesWallet.address as Address)

        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        const channelStream = await bob.waitForStream(channelId!)
        // Validate Alice is member of the channel
        await waitFor(() =>
            channelStream.view.membershipContent.isMember(MembershipOp.SO_JOIN, alice.userId),
        )

        // Burn Alice's NFT and validate her zero balance. She should now fail an entitlement check for the
        // channel.
        await TestERC721.burn('TestNFT', tokenId)
        await expect(
            TestERC721.balanceOf('TestNFT', alicesWallet.address as Address),
        ).resolves.toBe(0)

        // Wait 5 seconds for the positive auth cache to expire
        await new Promise((f) => setTimeout(f, 5000))

        // Have alice solicit keys in the channel where she just lost entitlements.
        // This key solicitation should fail because she no longer has the required NFT.
        // Additionally, she should be removed from the channel.
        const payload = make_MemberPayload_KeySolicitation({
            deviceKey: 'alice-new-device',
            sessionIds: [],
            fallbackKey: 'alice-fallback-key',
            isNewDevice: true,
        })
        await expect(alice.makeEventAndAddToStream(channelId!, payload)).rejects.toThrow(
            /7:PERMISSION_DENIED/,
        )

        // Alice's user stream should reflect that she is no longer a member of the channel.
        // TODO why no linter complain with no await here?
        const aliceUserStream = await alice.waitForStream(alice.userStreamId!)
        await waitFor(() =>
            expect(
                aliceUserStream.view.userContent.isMember(channelId!, MembershipOp.SO_LEAVE),
            ).toBeTruthy(),
        )
        await waitFor(() =>
            expect(
                channelStream.view.membershipContent.isMember(MembershipOp.SO_LEAVE, alice.userId),
            ).toBeTruthy(),
        )

        // Alice cannot rejoin the stream.
        await expectUserCannotJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        await bob.stopSync()
        await alice.stopSync()
    })

    test('user cannot post after entitlement loss', async () => {
        const testNftAddress = await TestERC721.getContractAddress('TestNFT')
        const { alice, alicesWallet, aliceSpaceDapp, bob, spaceId, channelId } =
            await setupChannelWithCustomRole([], getNftRuleData(testNftAddress), [
                Permission.Read,
                Permission.Write,
            ])

        // Mint an nft for alice - she should be able to join now
        const tokenId = await TestERC721.publicMint('TestNFT', alicesWallet.address as Address)

        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        const channelStream = await bob.waitForStream(channelId!)
        // Validate Alice is member of the channel
        await waitFor(() =>
            channelStream.view.membershipContent.isMember(MembershipOp.SO_JOIN, alice.userId),
        )

        // Burn Alice's NFT and validate her zero balance. She should now fail an entitlement check for the
        // channel.
        await TestERC721.burn('TestNFT', tokenId)
        await expect(
            TestERC721.balanceOf('TestNFT', alicesWallet.address as Address),
        ).resolves.toBe(0)

        // Wait 5 seconds for the positive auth cache to expire
        await new Promise((f) => setTimeout(f, 5000))

        // Alice should not be able to post to the channel after losing entitlements.
        // However she remains a member of the stream because this message is never sent by the
        // client.
        await expect(
            alice.sendMessage(channelId!, 'Message after entitlement loss'),
        ).rejects.toThrow(/*not entitled to add message to channel*/)

        await bob.stopSync()
        await alice.stopSync()
    })
})
