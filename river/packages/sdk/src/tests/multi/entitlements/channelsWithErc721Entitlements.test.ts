/**
 * @group with-entitlements
 */

import {
    getNftRuleData,
    linkWallets,
    setupChannelWithCustomRole,
    expectUserCanJoinChannel,
    expectUserCannotJoinChannel,
} from '../../testUtils'
import { dlog } from '@river-build/dlog'
import { Address, TestERC721 } from '@river-build/web3'

const log = dlog('csb:test:channelsWithErc721Entitlements')

describe('channelsWithErc721Entitlements', () => {
    test('oneNftGateJoinPass - join as root, asset in linked wallet', async () => {
        const testNft1Address = await TestERC721.getContractAddress('TestNFT1')
        const {
            alice,
            bob,
            aliceSpaceDapp,
            aliceProvider,
            carolsWallet,
            carolProvider,
            spaceId,
            channelId,
        } = await setupChannelWithCustomRole([], getNftRuleData(testNft1Address))

        // Link carol's wallet to alice's as root
        await linkWallets(aliceSpaceDapp, aliceProvider.wallet, carolProvider.wallet)

        // Validate alice cannot join the channel
        await expectUserCannotJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        // Mint the needed asset to Alice's linked wallet
        log('Minting an NFT for carols wallet, which is linked to alices wallet')
        await TestERC721.publicMint('TestNFT1', carolsWallet.address as Address)

        // Wait 2 seconds for the negative auth cache to expire
        await new Promise((f) => setTimeout(f, 2000))

        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('oneNftGateJoinPass - join as linked wallet, asset in root wallet', async () => {
        const testNft1Address = await TestERC721.getContractAddress('TestNFT1')
        const {
            alice,
            bob,
            aliceSpaceDapp,
            carolSpaceDapp,
            aliceProvider,
            carolsWallet,
            carolProvider,
            spaceId,
            channelId,
        } = await setupChannelWithCustomRole([], getNftRuleData(testNft1Address))

        log("Joining alice's wallet as a linked wallet to carols root wallet")
        await linkWallets(carolSpaceDapp, carolProvider.wallet, aliceProvider.wallet)

        log('Minting an NFT for carols wallet, which is the root to alices wallet')
        await TestERC721.publicMint('TestNFT1', carolsWallet.address as Address)

        log('expect that alice can join the space')
        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('oneNftGateJoinPass', async () => {
        const testNftAddress = await TestERC721.getContractAddress('TestNFT')
        const { alice, alicesWallet, aliceSpaceDapp, bob, spaceId, channelId } =
            await setupChannelWithCustomRole([], getNftRuleData(testNftAddress))

        // Alice initially cannot join because she has no nft
        await expectUserCannotJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        // Mint an nft for alice - she should be able to join now
        await TestERC721.publicMint('TestNFT', alicesWallet.address as Address)

        // Wait 2 seconds for the negative auth cache to expire
        await new Promise((f) => setTimeout(f, 2000))

        // Validate alice can join the channel
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        await bob.stopSync()
        await alice.stopSync()
    })

    test('oneNftGateJoinFail', async () => {
        const testNft1Address = await TestERC721.getContractAddress('TestNFT1')
        const { alice, aliceSpaceDapp, bob, spaceId, channelId } = await setupChannelWithCustomRole(
            [],
            getNftRuleData(testNft1Address),
        )

        // Alice has no NFTs, so she should not be able to join the channel
        await expectUserCannotJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
    })
})
