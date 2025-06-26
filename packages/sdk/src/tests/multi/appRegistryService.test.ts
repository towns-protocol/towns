import { makeSignerContext } from '../../signerContext'
import { AppRegistryService } from '../../appRegistryService'
import { ethers } from 'ethers'
import { getAppRegistryUrl } from '../../riverConfig'

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
})
