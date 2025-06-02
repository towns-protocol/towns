import { makeSignerContext } from '../../signerContext'
import { AppRegistryService } from '../../appRegistryService'
import { ethers } from 'ethers'

export const appRegistryUrl = 'https://localhost:6170'

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
