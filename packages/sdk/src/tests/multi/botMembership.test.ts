/**
 * @group with-entitlements
 */

import {
    Address,
    AppRegistryDapp,
    Permission,
    SpaceAddressFromSpaceId,
    NoopRuleData,
} from '@towns-protocol/web3'
import {
    createSpaceAndDefaultChannel,
    everyoneMembershipStruct,
    setupWalletsAndContexts,
    waitFor,
    createTownWithRequirements,
    createChannel,
    getXchainConfigForTesting,
    makeTestClient,
} from '../testUtils'
import { makeBaseChainConfig } from '../../riverConfig'
import { ethers } from 'ethers'
import { MembershipOp } from '@towns-protocol/proto'

describe('bot membership tests', () => {
    test('registered and installed bots can join spaces and channels', async () => {
        const {
            aliceProvider: ownerProvider,
            bob: bot,
            bobsWallet: botWallet,
            bobProvider: botProvider,
            carol: spaceOwner,
            carolProvider: spaceOwnerProvider,
            carolSpaceDapp: spaceOwnerSpaceDapp,
        } = await setupWalletsAndContexts()

        const appRegistryDapp = new AppRegistryDapp(
            makeBaseChainConfig().chainConfig,
            ownerProvider,
        )

        // Create bot app contract
        const tx = await appRegistryDapp.createApp(
            botProvider.signer,
            'bob-bot',
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

        // Create a town with channels
        const everyoneMembership = await everyoneMembershipStruct(spaceOwnerSpaceDapp, spaceOwner)
        const { spaceId, defaultChannelId: channelId } = await createSpaceAndDefaultChannel(
            spaceOwner,
            spaceOwnerSpaceDapp,
            spaceOwnerProvider.wallet,
            "space owner's town",
            everyoneMembership,
        )

        // Install the bot to the space
        const tx2 = await appRegistryDapp.installApp(
            spaceOwnerProvider.signer,
            foundAppAddress as Address,
            SpaceAddressFromSpaceId(spaceId) as Address,
            ethers.utils.parseEther('0.02').toBigInt(), // sending more to cover protocol fee
        )

        // Confirm installation transaction succeeded
        const receipt2 = await tx2.wait()
        expect(receipt2.status).toBe(1)

        const space = spaceOwnerSpaceDapp.getSpace(spaceId)
        expect(space).toBeDefined()

        // Sanity check: the spaceDapp reports that the app is installed.
        const installedApps = await space!.AppAccount.read.getInstalledApps()
        expect(installedApps).toContain(foundAppAddress)

        // Have space owner add the bot to the space
        await spaceOwner.joinUser(spaceId, bot.userId)

        // Validate the bot is now a member of both space and channel
        const botUserStreamView = bot.stream(bot.userStreamId!)!.view
        expect(botUserStreamView).toBeDefined()

        await waitFor(() => {
            expect(botUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(true)
        })

        // Have space owner add the bot to the channel
        await expect(spaceOwner.joinUser(channelId, bot.userId)).resolves.toBeDefined()

        // Validate that the bot is a channel member
        await waitFor(() => {
            expect(botUserStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN)).toBe(
                true,
            )
        })

        // Cleanup
        await bot.stopSync()
        await spaceOwner.stopSync()
    })

    test('registered and installed bots can join spaces and channels in towns with gated membership', async () => {
        // Create a town with user entitlements that only allows 'bob' (space owner)
        // The bot is NOT in this list, so it doesn't satisfy the space entitlements.
        // Thus we know the bot is disqualified for regular membership by the gating
        // and can only be admitted to the space via the bot entitlement pathway.
        const {
            spaceId,
            channelId: defaultChannelId,
            bob: spaceOwner,
            bobProvider: spaceOwnerProvider,
            bobSpaceDapp: spaceOwnerSpaceDapp,
            alice: bot,
            alicesWallet: botWallet,
            aliceProvider: botProvider,
        } = await createTownWithRequirements({
            everyone: false,
            users: ['bob'], // No one but the space owner can join this town
            ruleData: NoopRuleData,
        })

        const appRegistryDapp = new AppRegistryDapp(
            makeBaseChainConfig().chainConfig,
            spaceOwnerProvider,
        )

        // Create bot app contract
        const tx = await appRegistryDapp.createApp(
            botProvider.signer,
            'bot-restricted-test',
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

        // Create a custom channel with user entitlements that disallows all users.
        // The bot naturally doesn't satisfy the channel entitlements.
        const { channelId: restrictedChannelId, error: channelError } = await createChannel(
            spaceOwnerSpaceDapp,
            spaceOwnerProvider,
            spaceId,
            'restricted-channel',
            [], // No role IDs - no users qualify for admission to this channel.
            spaceOwnerProvider.wallet,
        )
        expect(channelError).toBeUndefined()
        expect(restrictedChannelId).toBeDefined()

        const { streamId: returnedChannelId } = await spaceOwner.createChannel(
            spaceId,
            'restricted-channel',
            '',
            restrictedChannelId!,
        )
        expect(returnedChannelId).toEqual(restrictedChannelId)

        // Verify that the bot does NOT satisfy space entitlements.
        const botEntitledWallet = await spaceOwnerSpaceDapp.getEntitledWalletForJoiningSpace(
            spaceId,
            botWallet.address,
            getXchainConfigForTesting(),
        )
        expect(botEntitledWallet).toBeUndefined() // Bot should NOT be entitled

        // Space owner CAN add bot to space despite bot not satisfying entitlements
        await expect(spaceOwner.joinUser(spaceId, bot.userId)).resolves.toBeDefined()

        // Validate bot is a space member
        const botUserStreamView = bot.stream(bot.userStreamId!)!.view
        await waitFor(() => {
            expect(botUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(true)
        })

        // Space owner CAN add bot to default channel despite bot not satisfying entitlements
        await expect(spaceOwner.joinUser(defaultChannelId, bot.userId)).resolves.toBeDefined()

        // Validate bot is a default channel member
        await waitFor(() => {
            expect(
                botUserStreamView.userContent.isMember(defaultChannelId, MembershipOp.SO_JOIN),
            ).toBe(true)
        })

        // Space owner CAN add bot to restricted channel despite bot not satisfying channel entitlements
        await expect(spaceOwner.joinUser(restrictedChannelId!, bot.userId)).resolves.toBeDefined()

        // Validate bot is a restricted channel member
        await waitFor(() => {
            expect(
                botUserStreamView.userContent.isMember(restrictedChannelId!, MembershipOp.SO_JOIN),
            ).toBe(true)
        })

        // Cleanup
        await bot.stopSync()
        await spaceOwner.stopSync()
    })

    test('an uninstalled bot cannot join a space or channel', async () => {
        const {
            aliceProvider: ownerProvider,
            bob: bot,
            bobsWallet: botWallet,
            bobProvider: botProvider,
            carol: spaceOwner,
            carolProvider: spaceOwnerProvider,
            carolSpaceDapp: spaceOwnerSpaceDapp,
        } = await setupWalletsAndContexts()

        const appRegistryDapp = new AppRegistryDapp(
            makeBaseChainConfig().chainConfig,
            ownerProvider,
        )

        // Create bot app contract
        const tx = await appRegistryDapp.createApp(
            botProvider.signer,
            'bob-bot',
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

        // Create a town with channels
        const everyoneMembership = await everyoneMembershipStruct(spaceOwnerSpaceDapp, spaceOwner)
        const { spaceId, defaultChannelId: channelId } = await createSpaceAndDefaultChannel(
            spaceOwner,
            spaceOwnerSpaceDapp,
            spaceOwnerProvider.wallet,
            "space owner's town",
            everyoneMembership,
        )

        // NOTE: We do NOT install the bot to the space (unlike the previous test)
        // This is the key difference - the bot is registered but not installed

        const space = spaceOwnerSpaceDapp.getSpace(spaceId)
        expect(space).toBeDefined()

        // Sanity check: the spaceDapp reports that the app is NOT installed
        const installedApps = await space!.AppAccount.read.getInstalledApps()
        expect(installedApps).not.toContain(foundAppAddress)

        // Space owner tries to add the uninstalled bot to the space - this should fail
        await expect(spaceOwner.joinUser(spaceId, bot.userId)).rejects.toThrow()

        // Space owner tries to add the uninstalled bot to the channel - this should also fail
        await expect(spaceOwner.joinUser(channelId, bot.userId)).rejects.toThrow()

        // Clean up
        await bot.stopSync()
        await spaceOwner.stopSync()
    })

    test('a non-owner member cannot add or remove a bot as a space or channel member', async () => {
        const {
            alice: nonOwnerMember,
            aliceProvider: nonOwnerProvider,
            alicesWallet: nonOwnerWallet,
            bob: bot,
            bobsWallet: botWallet,
            bobProvider: botProvider,
            carol: spaceOwner,
            carolProvider: spaceOwnerProvider,
            carolSpaceDapp: spaceOwnerSpaceDapp,
        } = await setupWalletsAndContexts()

        const appRegistryDapp = new AppRegistryDapp(
            makeBaseChainConfig().chainConfig,
            spaceOwnerProvider,
        )

        // Create bot app contract
        const tx = await appRegistryDapp.createApp(
            botProvider.signer,
            'bob-bot',
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

        // Create a spaceDapp for the non-owner member
        const nonOwnerSpaceDapp = spaceOwnerSpaceDapp // They can use the same spaceDapp instance

        // Have non-owner member join the space and channel
        const { issued } = await nonOwnerSpaceDapp.joinSpace(
            spaceId,
            nonOwnerWallet.address,
            nonOwnerProvider.wallet,
        )
        expect(issued).toBe(true)

        await nonOwnerMember.initializeUser({ spaceId })
        nonOwnerMember.startSync()

        await expect(nonOwnerMember.joinStream(spaceId)).resolves.not.toThrow()
        await expect(nonOwnerMember.joinStream(channelId)).resolves.not.toThrow()

        // First test that non-owner member CANNOT add bot to space (even though bot is installed)
        await expect(nonOwnerMember.joinUser(spaceId, bot.userId)).rejects.toThrow(
            /PERMISSION_DENIED/,
        )

        // Validate that bot is NOT a space member yet
        const botUserStreamView = bot.stream(bot.userStreamId!)!.view
        expect(botUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(false)

        // Have space owner add bot to space (so we can test channel membership)
        await expect(spaceOwner.joinUser(spaceId, bot.userId)).resolves.toBeDefined()

        // Validate bot is now a space member
        await waitFor(() => {
            expect(botUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(true)
        })

        // Now test that non-owner member CANNOT add bot to channel (even though bot is installed and space member)
        await expect(nonOwnerMember.joinUser(channelId, bot.userId)).rejects.toThrow(
            /PERMISSION_DENIED/,
        )

        // Validate that bot is still NOT a channel member
        expect(botUserStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN)).toBe(false)

        // Also test that non-owner member cannot remove bot from space
        await expect(nonOwnerMember.removeUser(spaceId, bot.userId)).rejects.toThrow(
            /PERMISSION_DENIED/,
        )

        // Validate bot is still a space member
        expect(botUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(true)

        // Now, let's confirm the non-owner member cannot boot the bot from the channel.

        // Have space owner add bot to channel
        await expect(spaceOwner.joinUser(channelId, bot.userId)).resolves.toBeDefined()

        // Validate bot is now a channel member
        await waitFor(() => {
            expect(botUserStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN)).toBe(
                true,
            )
        })

        // Test that non-owner member CANNOT remove bot from channel
        await expect(nonOwnerMember.removeUser(channelId, bot.userId)).rejects.toThrow(
            /PERMISSION_DENIED/,
        )

        // Validate bot is still a channel member
        expect(botUserStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN)).toBe(true)

        // Cleanup
        await bot.stopSync()
        await spaceOwner.stopSync()
        await nonOwnerMember.stopSync()
    })

    test('the bot itself cannot add itself to the space or to channels', async () => {
        const {
            bob: bot,
            bobsWallet: botWallet,
            bobProvider: botProvider,
            carol: spaceOwner,
            carolProvider: spaceOwnerProvider,
            carolSpaceDapp: spaceOwnerSpaceDapp,
        } = await setupWalletsAndContexts()

        const appRegistryDapp = new AppRegistryDapp(
            makeBaseChainConfig().chainConfig,
            spaceOwnerProvider,
        )

        // Create bot app contract
        const tx = await appRegistryDapp.createApp(
            botProvider.signer,
            'self-join-test-bot',
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

        // Test that bot CANNOT add itself to space (even though bot is installed)
        await expect(bot.joinUser(spaceId, bot.userId)).rejects.toThrow(/PERMISSION_DENIED/)

        // Validate that bot is NOT a space member
        const botUserStreamView = bot.stream(bot.userStreamId!)!.view
        expect(botUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(false)

        // Have space owner add bot to space (so we can test channel self-join)
        await expect(spaceOwner.joinUser(spaceId, bot.userId)).resolves.toBeDefined()

        // Validate bot is now a space member
        await waitFor(() => {
            expect(botUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(true)
        })

        // Test that bot CANNOT add itself to channel (even though bot is installed and space member)
        await expect(bot.joinUser(channelId, bot.userId)).rejects.toThrow(/PERMISSION_DENIED/)

        // Validate that bot is still NOT a channel member
        expect(botUserStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN)).toBe(false)

        // Also test that bot cannot remove itself from space
        await expect(bot.removeUser(spaceId, bot.userId)).rejects.toThrow(/PERMISSION_DENIED/)

        // Validate bot is still a space member
        expect(botUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(true)

        // Have space owner add bot to channel (so we can test channel self-removal)
        await expect(spaceOwner.joinUser(channelId, bot.userId)).resolves.toBeDefined()

        // Validate bot is now a channel member
        await waitFor(() => {
            expect(botUserStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN)).toBe(
                true,
            )
        })

        // Test that bot CANNOT remove itself from channel
        await expect(bot.removeUser(channelId, bot.userId)).rejects.toThrow(/PERMISSION_DENIED/)

        // Validate bot is still a channel member
        expect(botUserStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN)).toBe(true)

        // Cleanup
        await bot.stopSync()
        await spaceOwner.stopSync()
    })

    test('bots cannot be added to DMs or GDMs', async () => {
        const {
            aliceProvider: ownerProvider,
            bob: bot,
            bobsWallet: botWallet,
            bobProvider: botProvider,
            carol,
        } = await setupWalletsAndContexts()

        const dave = await makeTestClient()

        const appRegistryDapp = new AppRegistryDapp(
            makeBaseChainConfig().chainConfig,
            ownerProvider,
        )

        const tx = await appRegistryDapp.createApp(
            botProvider.signer,
            'bob-bot',
            [Permission.Read, Permission.Write],
            botWallet.address as Address,
            ethers.utils.parseEther('0.01').toBigInt(),
            31536000n,
        )
        const receipt = await tx.wait()
        const { app: foundAppAddress } = appRegistryDapp.getCreateAppEvent(receipt)
        expect(foundAppAddress).toBeDefined()

        expect(await bot.initializeUser({ appAddress: foundAppAddress })).toBeDefined()

        // GDMs with bot creators are disallowed.
        await expect(carol.createGDMChannel([bot.userId, dave.userId])).rejects.toThrow(
            /PERMISSION_DENIED/,
        )

        // DMs with bot creators are disallowed.
        await expect(carol.createDMChannel(bot.userId)).rejects.toThrow(/PERMISSION_DENIED/)
    })
})
