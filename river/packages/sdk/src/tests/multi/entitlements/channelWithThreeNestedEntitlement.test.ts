/**
 * @group with-entitlements
 */

import {
    setupWalletsAndContexts,
    expectUserCanJoin,
    setupChannelWithCustomRole,
    expectUserCanJoinChannel,
    expectUserCannotJoinChannel,
} from '../../testUtils'
import { Address, TestERC721, createExternalNFTStruct } from '@river-build/web3'

describe('channelsWithThreeNestedEntitlements', () => {
    // This test takes almost one minute to run in CI and therefore gets its own file.
    test('user with only one entitlement from 3-nested NFT rule data can join channel', async () => {
        const testNft1 = 'TestNft1'
        const testNft2 = 'TestNft2'
        const testNft3 = 'TestNft3'
        const testNftAddress = await TestERC721.getContractAddress(testNft1)
        const testNftAddress2 = await TestERC721.getContractAddress(testNft2)
        const testNftAddress3 = await TestERC721.getContractAddress(testNft3)

        const ruleData = createExternalNFTStruct([testNftAddress, testNftAddress2, testNftAddress3])
        const {
            alice,
            alicesWallet,
            aliceSpaceDapp,
            bob,
            carol,
            carolsWallet,
            carolSpaceDapp,
            spaceId,
            defaultChannelId,
            channelId,
        } = await setupChannelWithCustomRole([], ruleData)

        // Set up additional users
        const {
            alice: dave,
            alicesWallet: davesWallet,
            aliceSpaceDapp: daveSpaceDapp,
            aliceProvider: daveProvider,
        } = await setupWalletsAndContexts()
        // Add Dave to the space
        await expectUserCanJoin(
            spaceId,
            defaultChannelId,
            'dave',
            dave,
            daveSpaceDapp,
            davesWallet.address,
            daveProvider.wallet,
        )

        // Alice initially cannot join because she has no nft
        await expectUserCannotJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        // Alice, Carol and Dave will each have one of the three NFTs, all should be able to join.
        // Mint an nft for alice - she should be able to join now
        await TestERC721.publicMint(testNft1, alicesWallet.address as Address)

        // Wait 2 seconds for the negative auth cache on the client to expire
        await new Promise((f) => setTimeout(f, 2000))

        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        // Mint an nft for carol - she should be able to join now
        await TestERC721.publicMint(testNft2, carolsWallet.address as Address)

        // Validate carol can join the channel
        await expectUserCanJoinChannel(carol, carolSpaceDapp, spaceId, channelId!)

        // Mint an nft for dave - he should be able to join now
        await TestERC721.publicMint(testNft3, davesWallet.address as Address)

        // Validate dave can join the channel
        await expectUserCanJoinChannel(dave, daveSpaceDapp, spaceId, channelId!)

        await bob.stopSync()
        await alice.stopSync()
        await carol.stopSync()
        await dave.stopSync()
    })
})
