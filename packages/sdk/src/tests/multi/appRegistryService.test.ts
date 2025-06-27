import { makeSignerContext } from '../../signerContext'
import { AppRegistryService } from '../../appRegistryService'
import { ethers } from 'ethers'
import { getAppRegistryUrl } from '../../riverConfig'
import { bin_fromHexString } from '@towns-protocol/dlog'
import {
    setupWalletsAndContexts,
    createSpaceAndDefaultChannel,
    everyoneMembershipStruct,
} from '../testUtils'

const appRegistryUrl = getAppRegistryUrl(process.env.RIVER_ENV!)

describe('appRegistryService test', () => {
    test('authenticate with primary key', async () => {
        const wallet = ethers.Wallet.createRandom()
        const { finishResponse } = await AppRegistryService.authenticateWithSigner(
            wallet.address,
            wallet,
            appRegistryUrl,
        )
        expect(finishResponse.sessionToken).toBeDefined()
    })
    test('authenticate with delegate key', async () => {
        const wallet = ethers.Wallet.createRandom()
        const delegateWallet = ethers.Wallet.createRandom()
        const signerContext = await makeSignerContext(wallet, delegateWallet, { days: 1 })

        const { finishResponse } = await AppRegistryService.authenticate(
            signerContext,
            appRegistryUrl,
        )
        expect(finishResponse.sessionToken).toBeDefined()
    })
    test('cannot register a non-app user stream', async () => {
        // Set up wallets and contexts for space creation
        const { bob, bobProvider, bobSpaceDapp } = await setupWalletsAndContexts()

        // Create a space so that bob's user stream can be initialized.
        const everyoneMembership = await everyoneMembershipStruct(bobSpaceDapp, bob)
        await createSpaceAndDefaultChannel(
            bob,
            bobSpaceDapp,
            bobProvider.wallet,
            'test space',
            everyoneMembership,
        )

        // Authentication should work for any user
        const { appRegistryRpcClient } = await AppRegistryService.authenticateWithSigner(
            bob.userId,
            bob.wallet, // Use wallet directly as signer
            appRegistryUrl,
        )
        expect(appRegistryRpcClient).toBeDefined()

        // However, trying to register should fail because the user's address
        // is not a registered app contract address
        await expect(
            appRegistryRpcClient.register({
                appId: bin_fromHexString(bob.wallet.address), // Regular user address, not an app contract
                appOwnerId: bin_fromHexString(bob.userId),
            }),
        ).rejects.toThrow()

        // Cleanup
        await bob.stopSync()
    })
})
