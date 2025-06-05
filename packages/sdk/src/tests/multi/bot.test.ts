import { Address, AppRegistryDapp, Permission } from '@towns-protocol/web3'
import { AppRegistryService } from '../../appRegistryService'
import { appRegistryUrl } from './appRegistryService.test'
import { setupWalletsAndContexts } from '../testUtils'
import { bin_fromHexString, bin_toBase64 } from '@towns-protocol/dlog'
import { makeBaseChainConfig } from '../../riverConfig'
import { createBinarySerialization } from '@connectrpc/connect/dist/cjs/protocol/serialization'

describe('bot tests', () => {
    test('registered bots can create app user streams', async () => {
        const {
            alice: owner,
            alicesWallet: ownerWallet,
            aliceProvider: ownerProvider,
            bob: bot,
            bobsWallet: botWallet,
            bobProvider: botProvider,
        } = await setupWalletsAndContexts()

        const appRegistryDapp = new AppRegistryDapp(
            makeBaseChainConfig().chainConfig,
            ownerProvider,
        )

        const tx = await appRegistryDapp.createApp(
            botProvider.signer,
            'bob-bot',
            [Permission.Read, Permission.Write],
            [botWallet.address as Address],
        )
        const receipt = await tx.wait()
        const { app: foundAppAddress } = appRegistryDapp.getCreateAppEvent(receipt)

        await appRegistryDapp.registerApp(botProvider.signer, foundAppAddress as Address, [
            botWallet.address as Address,
        ])

        // const { appRegistryRpcClient } = await AppRegistryService.authenticateWithSigner(
        //     ownerWallet.address,
        //     ownerProvider.signer,
        //     appRegistryUrl,
        // )
        // await appRegistryRpcClient.register({
        //     appId: bin_fromHexString(botWallet.address),
        //     appOwnerId: bin_fromHexString(ownerWallet.address),
        // })

        expect(await bot.initializeUser({ appAddress: foundAppAddress })).not.toThrow()
    })

    test('unregistered bots cannot create app user streams', async () => {})
})
