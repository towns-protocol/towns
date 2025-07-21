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
    setupWalletsAndContexts,
    everyoneMembershipStruct,
    createSpaceAndDefaultChannel,
} from '../testUtils'
import { dlog } from '@towns-protocol/dlog'
import {
    Address,
    TestERC721,
    AppRegistryDapp,
    Permission,
    SpaceAddressFromSpaceId,
} from '@towns-protocol/web3'
import { ethers } from 'ethers'
import { makeBaseChainConfig } from '../../riverConfig'
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
            linkWallets(aliceSpaceDapp, aliceProvider.wallet, aliceLinkedWallet),
            linkWallets(carolSpaceDapp, carolProvider.wallet, carolLinkedWallet),
        ])
        // Mint the needed asset to Alice and Carol's linked wallets
        log('Minting an NFT to alices linked wallet')
        await Promise.all([
            TestERC721.publicMint(TestNftName, aliceLinkedWallet.address as Address),
            TestERC721.publicMint(TestNftName, carolLinkedWallet.address as Address),
        ])

        // Join alice to the channel based on her linked wallet credentials
        await expectUserCanJoinChannel(alice, aliceSpaceDapp, spaceId, channelId!)

        await unlinkWallet(aliceSpaceDapp, aliceProvider.wallet, aliceLinkedWallet)

        // Wait 5 seconds so the channel stream will become eligible for scrubbing
        await new Promise((f) => setTimeout(f, 5000))

        // When carol's join event is added to the stream, it should trigger a scrub, and Alice
        // should be booted from the stream since she unlinked her entitled wallet.
        await expectUserCanJoinChannel(carol, carolSpaceDapp, spaceId, channelId!)

        const userStreamView = (await alice.waitForStream(makeUserStreamId(alice.userId))).view
        // Wait for alice's user stream to have the leave event
        await waitFor(() => {
            const membership = userStreamView.userContent.getMembership(channelId!)
            expect(membership?.op).toBe(MembershipOp.SO_LEAVE)
            expect(membership?.reason).toBe(MembershipReason.MR_NOT_ENTITLED)
        })
    })

    test('Bot loses membership and is scrubbed from channel when uninstalled from space', async () => {
        const {
            alice: spaceOwner,
            aliceProvider: spaceOwnerProvider,
            aliceSpaceDapp: spaceOwnerSpaceDapp,
            bob: bot,
            bobsWallet: botWallet,
            bobProvider: botProvider,
        } = await setupWalletsAndContexts()

        const appRegistryDapp = new AppRegistryDapp(
            makeBaseChainConfig().chainConfig,
            spaceOwnerProvider,
        )

        // Create bot app contract
        const tx = await appRegistryDapp.createApp(
            botProvider.signer,
            'scrub-test-bot',
            [Permission.Read, Permission.Write],
            botWallet.address as Address,
            ethers.utils.parseEther('0.01').toBigInt(),
            31536000n,
        )
        const receipt = await tx.wait()
        const { app: foundAppAddress } = appRegistryDapp.getCreateAppEvent(receipt)
        expect(foundAppAddress).toBeDefined()

        // Create bot user streams
        await expect(bot.initializeUser({ appAddress: foundAppAddress })).resolves.toBeDefined()
        bot.startSync()

        // Create a town with channels (everyone can join)
        const everyoneMembership = await everyoneMembershipStruct(spaceOwnerSpaceDapp, spaceOwner)
        const { spaceId, defaultChannelId: channelId } = await createSpaceAndDefaultChannel(
            spaceOwner,
            spaceOwnerSpaceDapp,
            spaceOwnerProvider.wallet,
            "space owner's town",
            everyoneMembership,
        )

        // Install the bot to the space (as space owner)
        const installTx = await appRegistryDapp.installApp(
            spaceOwnerProvider.signer,
            foundAppAddress as Address,
            SpaceAddressFromSpaceId(spaceId) as Address,
            ethers.utils.parseEther('0.02').toBigInt(),
        )
        const installReceipt = await installTx.wait()
        expect(installReceipt.status).toBe(1)

        // Verify bot is installed
        const space = spaceOwnerSpaceDapp.getSpace(spaceId)
        const installedApps = await space!.AppAccount.read.getInstalledApps()
        expect(installedApps).toContain(foundAppAddress)

        // Have space owner add bot to space and channel
        await expect(spaceOwner.joinUser(spaceId, bot.userId)).resolves.toBeDefined()
        await expect(spaceOwner.joinUser(channelId, bot.userId)).resolves.toBeDefined()

        // Validate bot is a member of both space and channel
        const botUserStreamView = bot.stream(bot.userStreamId!)!.view
        await waitFor(() => {
            expect(botUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(true)
            expect(botUserStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN)).toBe(
                true,
            )
        })

        // Uninstall the bot from the space (this should make it lose membership eligibility)
        // Note: Using removeApp method - in a real implementation this might be a different method
        // like uninstallApp, but removeApp should serve the same purpose for testing
        const removeAppTx = await appRegistryDapp.uninstallApp(
            spaceOwnerProvider.signer,
            foundAppAddress as Address,
            space?.Address as Address,
        )
        const removeAppReceipt = await removeAppTx.wait()
        expect(removeAppReceipt.status).toBe(1)

        // Verify bot is no longer installed
        const installedAppsAfterRemoval = await space!.AppAccount.read.getInstalledApps()
        expect(installedAppsAfterRemoval).not.toContain(foundAppAddress)

        // Wait 5 seconds so the channel stream will become eligible for scrubbing
        await new Promise((f) => setTimeout(f, 5000))

        // Have the bot attempt to post a message to the channel to trigger scrubbing
        // This should fail with a permission error since the bot is no longer installed/entitled, and trigger a scrub
        await expect(bot.sendMessage(channelId, 'test message from bot')).rejects.toThrow(
            /PERMISSION_DENIED/,
        )

        // Wait for bot's user stream to have the leave event due to being scrubbed
        await waitFor(() => {
            const membership = botUserStreamView.userContent.getMembership(channelId)
            expect(membership?.op).toBe(MembershipOp.SO_LEAVE)
            expect(membership?.reason).toBe(MembershipReason.MR_NOT_ENTITLED)
        })

        // Cleanup
        await bot.stopSync()
        await spaceOwner.stopSync()
    })
})
