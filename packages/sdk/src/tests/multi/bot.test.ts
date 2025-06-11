import { Address, AppRegistryDapp, Permission, SpaceAddressFromSpaceId } from '@towns-protocol/web3'
import {
    createSpaceAndDefaultChannel,
    everyoneMembershipStruct,
    setupWalletsAndContexts,
} from '../testUtils'
import { makeBaseChainConfig } from '../../riverConfig'
import { ethers } from 'ethers'

describe('bot tests', () => {
    test('registered bots can create app user streams', async () => {
        const {
            aliceProvider: ownerProvider,
            bob: bot,
            bobsWallet: botWallet,
            bobProvider: botProvider,
        } = await setupWalletsAndContexts()

        console.log('bot wallet: ', botWallet.address)

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

        await expect(bot.initializeUser({ appAddress: foundAppAddress })).toBeDefined()
    })

    test('unregistered bots cannot create app user streams', async () => {
        const {
            alicesWallet: wallet,
            bob: bot,
            bobsWallet: botWallet,
            bobProvider: botProvider,
        } = await setupWalletsAndContexts()

        await expect(bot.initializeUser({ appAddress: wallet.address })).rejects.toThrow(
            /7:PERMISSION_DENIED/,
        )
    })

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

        // Create a town with channels
        const everyoneMembership = await everyoneMembershipStruct(spaceOwnerSpaceDapp, spaceOwner)
        const { spaceId, defaultChannelId: channelId } = await createSpaceAndDefaultChannel(
            spaceOwner,
            spaceOwnerSpaceDapp,
            spaceOwnerProvider.wallet,
            "space owner's town",
            everyoneMembership,
        )

        // Add the bot to the space
        const tx2 = await appRegistryDapp.installApp(
            spaceOwnerProvider.signer,
            foundAppAddress as Address,
            SpaceAddressFromSpaceId(spaceId) as Address,
            ethers.utils.parseEther('0.02').toBigInt(), // sending more to cover protocol fee
        )
        const receipt2 = await tx2.wait()
        expect(receipt.status).toBe(1)

        const space = spaceOwnerSpaceDapp.getSpace(spaceId)
        expect(space).toBeDefined()

        // Sanity check: the spaceDapp reports that the app is installed.
        const installedApps = await space!.AppAccount.read.getInstalledApps()
        expect(installedApps).toContain(foundAppAddress)

        console.log('app validated s installed...')

        await expect(spaceOwner.joinUser(spaceId, bot.userId)).resolves.toBeDefined()
    })

    test('an uninstalled bot cannot join a space or channel', async () => {
        // const {
        //     aliceProvider: ownerProvider,
        //     bob: bot,10p
        //     bobsWallet: botWallet,
        //     bobProvider: botProvider,
        // } = await setupWalletsAndContexts()
        // console.log('bot wallet: ', botWallet.address)
        // const appRegistryDapp = new AppRegistryDapp(
        //     makeBaseChainConfig().chainConfig,
        //     ownerProvider,
        // )
        // const tx = await appRegistryDapp.createApp(
        //     botProvider.signer,
        //     'bob-bot',
        //     [Permission.Read, Permission.Write],
        //     botWallet.address as Address,
        //     ethers.utils.parseEther('0.01').toBigInt(),
        //     31536000n,
        // )
        // const receipt = await tx.wait()
        // const { app: foundAppAddress } = appRegistryDapp.getCreateAppEvent(receipt)
        // expect(foundAppAddress).toBeDefined()
        // // await appRegistryDapp.registerApp(
        // //     botProvider.signer,
        // //     foundAppAddress as Address,
        // //     botWallet.address as Address,
        // // )
        // // const { appRegistryRpcClient } = await AppRegistryService.authenticateWithSigner(
        // //     ownerWallet.address,
        // //     ownerProvider.signer,
        // //     appRegistryUrl,
        // // )
        // // await appRegistryRpcClient.register({
        // //     appId: bin_fromHexString(botWallet.address),
        // //     appOwnerId: bin_fromHexString(ownerWallet.address),
        // // })
        // await expect(bot.initializeUser({ appAddress: foundAppAddress })).toBeDefined()
    })

    test('a non-owner member cannot add a bot as a space member, even if the bot is installed', async () => {
        // TODO
    })

    test('a non-owner member cannot add a bot to channels', async () => {
        // TODO
    })

    test('bot READ permissions to channels are determined by isAppEntitled', async () => {
        // If a bot has no READ permission it cannot post key solicitations in a channel even
        // if it is a member.
    })

    test('bot write permissions to channels are determined by isAppEntitled', async () => {
        // Create a space that grants WRITE to everyone on the general channel but disallow this permission to
        // the bot. Then have the space owner install the bot, join it to the space and general channel.
        // The bot should be disallowed from posting to the channel. A bot with WRITE permissions should, however,
        // be able to post.
    })

    test('bots cannot create dms or gdms', async () => {
        // DMs and GDMs are created by the bot posting messages to it's own user stream. This message type
        // should be rejected as unpermitted for bots.
    })

    test('dms or gdms with a bot as a member cannot be created', () => {})
})
