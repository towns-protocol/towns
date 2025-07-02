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
    createChannel,
    createRole,
} from '../testUtils'
import { makeBaseChainConfig } from '../../riverConfig'
import { ethers } from 'ethers'
import { MembershipOp } from '@towns-protocol/proto'
import { make_MemberPayload_KeySolicitation } from '../../types'

describe('bot entitlements tests', () => {
    test('bot has READ permissions to channels when granted by isAppEntitled', async () => {
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

        // Create bot app contract with READ permission only
        const tx = await appRegistryDapp.createApp(
            botProvider.signer,
            'read-only-bot',
            [Permission.Read], // Only READ permission, no WRITE
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
        const { spaceId } = await createSpaceAndDefaultChannel(
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

        // Create a role that only grants WRITE permission (not READ) to everyone
        // This will deny the bot WRITE access to the channel
        const { error: roleError } = await createRole(
            spaceOwnerSpaceDapp,
            spaceOwnerProvider,
            spaceId,
            'write-only-role',
            [Permission.Write], // Only WRITE permission, no READ
            [], // No specific users - this role won't help the bot
            NoopRuleData,
            spaceOwnerProvider.wallet,
        )
        expect(roleError).toBeUndefined()

        // Create a custom channel that requires WRITE permission
        // The bot won't have WRITE permission through roles, but should have READ through app entitlements
        const { channelId: restrictedChannelId, error: channelError } = await createChannel(
            spaceOwnerSpaceDapp,
            spaceOwnerProvider,
            spaceId,
            'read-only-channel',
            [1], // Use the write-only role (role ID 1) - bot won't qualify
            spaceOwnerProvider.wallet,
        )
        expect(channelError).toBeUndefined()
        expect(restrictedChannelId).toBeDefined()

        // Create the channel stream
        const { streamId: returnedChannelId } = await spaceOwner.createChannel(
            spaceId,
            'read-only-channel',
            '',
            restrictedChannelId!,
        )
        expect(returnedChannelId).toEqual(restrictedChannelId)

        // Have space owner add bot to space and channel
        await expect(spaceOwner.joinUser(spaceId, bot.userId)).resolves.toBeDefined()
        await expect(spaceOwner.joinUser(restrictedChannelId!, bot.userId)).resolves.toBeDefined()

        // Validate bot is a member of both space and channel
        const botUserStreamView = bot.stream(bot.userStreamId!)!.view
        await waitFor(() => {
            expect(botUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(true)
            expect(
                botUserStreamView.userContent.isMember(restrictedChannelId!, MembershipOp.SO_JOIN),
            ).toBe(true)
        })

        // Bot should be able to post a key solicitation because it has READ permission through isAppEntitled
        // Key solicitations require READ permission, not WRITE permission
        const payload = make_MemberPayload_KeySolicitation({
            deviceKey: 'bot-device-key',
            sessionIds: [],
            fallbackKey: 'bot-fallback-key',
            isNewDevice: true,
        })

        // This should succeed because the bot has READ permission via app entitlements
        const { error } = await bot.makeEventAndAddToStream(restrictedChannelId!, payload)
        expect(error).toBeUndefined()

        // Cleanup
        await bot.stopSync()
        await spaceOwner.stopSync()
    })

    test('bot has write permissions to channels when granted by isAppEntitled', async () => {
        const {
            alice: spaceOwner,
            aliceProvider: spaceOwnerProvider,
            aliceSpaceDapp: spaceOwnerSpaceDapp,
            bob: botWithoutWrite,
            bobsWallet: botWithoutWriteWallet,
            bobProvider: botWithoutWriteProvider,
            carol: botWithWrite,
            carolsWallet: botWithWriteWallet,
            carolProvider: botWithWriteProvider,
        } = await setupWalletsAndContexts()

        const appRegistryDapp = new AppRegistryDapp(
            makeBaseChainConfig().chainConfig,
            spaceOwnerProvider,
        )

        // Create first bot app contract with READ permission only (no WRITE)
        const tx1 = await appRegistryDapp.createApp(
            botWithoutWriteProvider.signer,
            'read-only-bot',
            [Permission.Read], // Only READ permission, no WRITE
            botWithoutWriteWallet.address as Address,
            ethers.utils.parseEther('0.01').toBigInt(),
            31536000n,
        )
        const receipt1 = await tx1.wait()
        const { app: readOnlyBotAddress } = appRegistryDapp.getCreateAppEvent(receipt1)
        expect(readOnlyBotAddress).toBeDefined()

        // Create second bot app contract with both READ and WRITE permissions
        const tx2 = await appRegistryDapp.createApp(
            botWithWriteProvider.signer,
            'read-write-bot',
            [Permission.Read, Permission.Write], // Both READ and WRITE permissions
            botWithWriteWallet.address as Address,
            ethers.utils.parseEther('0.01').toBigInt(),
            31536000n,
        )
        const receipt2 = await tx2.wait()
        const { app: readWriteBotAddress } = appRegistryDapp.getCreateAppEvent(receipt2)
        expect(readWriteBotAddress).toBeDefined()

        // Create bot user streams for both bots
        await expect(
            botWithoutWrite.initializeUser({ appAddress: readOnlyBotAddress }),
        ).resolves.toBeDefined()
        await expect(
            botWithWrite.initializeUser({ appAddress: readWriteBotAddress }),
        ).resolves.toBeDefined()
        botWithoutWrite.startSync()
        botWithWrite.startSync()

        // Create a town with channels (everyone can join)
        const everyoneMembership = await everyoneMembershipStruct(spaceOwnerSpaceDapp, spaceOwner)
        const { spaceId, defaultChannelId } = await createSpaceAndDefaultChannel(
            spaceOwner,
            spaceOwnerSpaceDapp,
            spaceOwnerProvider.wallet,
            "space owner's town",
            everyoneMembership,
        )

        // Install both bots to the space (as space owner)
        const installTx1 = await appRegistryDapp.installApp(
            spaceOwnerProvider.signer,
            readOnlyBotAddress as Address,
            SpaceAddressFromSpaceId(spaceId) as Address,
            ethers.utils.parseEther('0.02').toBigInt(),
        )
        const installReceipt1 = await installTx1.wait()
        expect(installReceipt1.status).toBe(1)

        const installTx2 = await appRegistryDapp.installApp(
            spaceOwnerProvider.signer,
            readWriteBotAddress as Address,
            SpaceAddressFromSpaceId(spaceId) as Address,
            ethers.utils.parseEther('0.02').toBigInt(),
        )
        const installReceipt2 = await installTx2.wait()
        expect(installReceipt2.status).toBe(1)

        // Verify both bots are installed
        const space = spaceOwnerSpaceDapp.getSpace(spaceId)
        const installedApps = await space!.AppAccount.read.getInstalledApps()
        expect(installedApps).toContain(readOnlyBotAddress)
        expect(installedApps).toContain(readWriteBotAddress)

        // Have space owner add both bots to space and default channel
        await expect(spaceOwner.joinUser(spaceId, botWithoutWrite.userId)).resolves.toBeDefined()
        await expect(
            spaceOwner.joinUser(defaultChannelId, botWithoutWrite.userId),
        ).resolves.toBeDefined()
        await expect(spaceOwner.joinUser(spaceId, botWithWrite.userId)).resolves.toBeDefined()
        await expect(
            spaceOwner.joinUser(defaultChannelId, botWithWrite.userId),
        ).resolves.toBeDefined()

        // Validate both bots are members of space and default channel
        const botWithoutWriteUserStreamView = botWithoutWrite.stream(
            botWithoutWrite.userStreamId!,
        )!.view
        const botWithWriteUserStreamView = botWithWrite.stream(botWithWrite.userStreamId!)!.view

        await waitFor(() => {
            expect(
                botWithoutWriteUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN),
            ).toBe(true)
            expect(
                botWithoutWriteUserStreamView.userContent.isMember(
                    defaultChannelId,
                    MembershipOp.SO_JOIN,
                ),
            ).toBe(true)
            expect(
                botWithWriteUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN),
            ).toBe(true)
            expect(
                botWithWriteUserStreamView.userContent.isMember(
                    defaultChannelId,
                    MembershipOp.SO_JOIN,
                ),
            ).toBe(true)
        })

        // Bot without WRITE permission should NOT be able to post a message
        await expect(
            botWithoutWrite.sendMessage(defaultChannelId, 'Message from read-only bot'),
        ).rejects.toThrow(/PERMISSION_DENIED/)

        // Bot with WRITE permission should be able to post a message
        await expect(
            botWithWrite.sendMessage(defaultChannelId, 'Message from read-write bot'),
        ).resolves.not.toThrow()

        // Cleanup
        await botWithoutWrite.stopSync()
        await botWithWrite.stopSync()
        await spaceOwner.stopSync()
    })

    // TODO: flaky test
    test.skip('bot does not have write permissions to channels when not granted by isAppEntitled', async () => {
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

        // Create bot app contract with READ permission only (no WRITE)
        const tx = await appRegistryDapp.createApp(
            botProvider.signer,
            'read-only-bot-no-write',
            [Permission.Read], // Only READ permission, no WRITE
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

        // Create a town with channels where everyone can join and has write permissions
        const everyoneMembership = await everyoneMembershipStruct(spaceOwnerSpaceDapp, spaceOwner)
        const { spaceId, defaultChannelId } = await createSpaceAndDefaultChannel(
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

        // Have space owner add bot to space and default channel
        await expect(spaceOwner.joinUser(spaceId, bot.userId)).resolves.toBeDefined()
        await expect(spaceOwner.joinUser(defaultChannelId, bot.userId)).resolves.toBeDefined()

        // Validate bot is a member of both space and channel
        const botUserStreamView = bot.stream(bot.userStreamId!)!.view
        await waitFor(() => {
            expect(botUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(true)
            expect(
                botUserStreamView.userContent.isMember(defaultChannelId, MembershipOp.SO_JOIN),
            ).toBe(true)
        })

        // Bot should NOT be able to post a message because it lacks WRITE permission through isAppEntitled
        // Even though the space grants write permissions to all users, the bot's app contract only has READ permission
        await expect(
            bot.sendMessage(defaultChannelId, 'Message from read-only bot'),
        ).rejects.toThrow(/PERMISSION_DENIED/)

        // Cleanup
        await bot.stopSync()
        await spaceOwner.stopSync()
    })
})
