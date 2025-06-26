/**
 * @group with-entitlements
 */

import { Address, AppRegistryDapp, Permission, SpaceAddressFromSpaceId } from '@towns-protocol/web3'
import {
    createSpaceAndDefaultChannel,
    everyoneMembershipStruct,
    setupWalletsAndContexts,
    expectUserCanJoin,
} from '../testUtils'
import { makeBaseChainConfig } from '../../riverConfig'
import { makeDefaultChannelStreamId } from '../../id'
import { ethers } from 'ethers'

describe('bot stream creation tests', () => {
    test('registered bots can only create app user streams with their registered app address', async () => {
        const {
            aliceProvider: ownerProvider,
            bob: bot1,
            bobsWallet: bot1Wallet,
            bobProvider: bot1Provider,
            carol: bot2,
            carolsWallet: bot2Wallet,
            carolProvider: bot2Provider,
        } = await setupWalletsAndContexts()

        const appRegistryDapp = new AppRegistryDapp(
            makeBaseChainConfig().chainConfig,
            ownerProvider,
        )

        // Create first bot app contract
        const tx1 = await appRegistryDapp.createApp(
            bot1Provider.signer,
            'bot1-app',
            [Permission.Read, Permission.Write],
            bot1Wallet.address as Address,
            ethers.utils.parseEther('0.01').toBigInt(),
            31536000n,
        )
        const receipt1 = await tx1.wait()
        const { app: bot1AppAddress } = appRegistryDapp.getCreateAppEvent(receipt1)
        expect(bot1AppAddress).toBeDefined()

        // Create second bot app contract
        const tx2 = await appRegistryDapp.createApp(
            bot2Provider.signer,
            'bot2-app',
            [Permission.Read, Permission.Write],
            bot2Wallet.address as Address,
            ethers.utils.parseEther('0.01').toBigInt(),
            31536000n,
        )
        const receipt2 = await tx2.wait()
        const { app: bot2AppAddress } = appRegistryDapp.getCreateAppEvent(receipt2)
        expect(bot2AppAddress).toBeDefined()

        // Attempt to create user streams for bot1 using bot2's app address (should fail)
        await expect(bot1.initializeUser({ appAddress: bot2AppAddress })).rejects.toThrow(
            /7:PERMISSION_DENIED/,
        )

        // Create user streams for bot2 using its own app address (should succeed)
        expect(await bot2.initializeUser({ appAddress: bot2AppAddress })).toBeDefined()
    })

    test('unregistered bots cannot create app user streams', async () => {
        const { alicesWallet: wallet, bob: bot } = await setupWalletsAndContexts()

        // Let's use the public key of the wallet as the bot's contract address for
        // convenience here.
        await expect(bot.initializeUser({ appAddress: wallet.address })).rejects.toThrow(
            /7:PERMISSION_DENIED/,
        )
    })

    // TODO: re-enable this test when the app registry contract is validated and deployed to all
    // environments.
    test.skip('bots cannot create dms or gdms', async () => {
        // DMs and GDMs are created by the bot posting messages to it's own user stream. This message type
        // should be rejected as unpermitted for bots.
        const {
            aliceProvider,
            alicesWallet,
            alice,
            aliceSpaceDapp,
            bob: bot,
            bobsWallet: botWallet,
            bobProvider: botProvider,
            carol,
            carolProvider,
            carolSpaceDapp,
        } = await setupWalletsAndContexts()

        const appRegistryDapp = new AppRegistryDapp(
            makeBaseChainConfig().chainConfig,
            botProvider, // use bot as it's own owner for convenience
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

        // Have Carol create a space on the spaceDapp
        const everyoneMembership = await everyoneMembershipStruct(carolSpaceDapp, carol)
        const { spaceId } = await createSpaceAndDefaultChannel(
            carol,
            carolSpaceDapp,
            carolProvider.wallet,
            "carol's space",
            everyoneMembership,
        )

        // Add Dave as a member to Carol's space
        await expectUserCanJoin(
            spaceId,
            makeDefaultChannelStreamId(SpaceAddressFromSpaceId(spaceId)),
            'alice',
            alice,
            aliceSpaceDapp,
            alicesWallet.address,
            aliceProvider.wallet,
        )

        // GDMs with bot creators are disallowed.
        await expect(bot.createGDMChannel([carol.userId, alice.userId])).rejects.toThrow(
            /PERMISSION_DENIED/,
        )

        // DMs with bot creators are disallowed.
        await expect(bot.createDMChannel(alice.userId)).rejects.toThrow(/PERMISSION_DENIED/)

        // Cleanup
        await carol.stopSync()
        await alice.stopSync()
    })
})
