/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { ethers } from 'ethers'
import { waitForOptions } from '@testing-library/react'
import { getJsonProvider, parseOptInt } from './TestUtils'
import { TestGatingNFT } from '@river-build/web3'

const amount = ethers.BigNumber.from(10).pow(18).toHexString()
const provider = getJsonProvider()

export class TestConstants {
    public static readonly EveryoneAddress = '0x0000000000000000000000000000000000000001'

    public static DefaultWaitForTimeoutMS = parseOptInt(process.env.WAIT_FOR_TIMEOUT) ?? 10000
    public static DoubleDefaultWaitForTimeout: waitForOptions = {
        timeout: TestConstants.DefaultWaitForTimeoutMS * 2,
    }
    public static DecaDefaultWaitForTimeout: waitForOptions = {
        timeout: TestConstants.DefaultWaitForTimeoutMS * 10,
    }

    public static async getWalletWithTestGatingNft(): Promise<ethers.Wallet> {
        try {
            const wallet = await this.getWalletWithoutNft()

            const testGatingNft = new TestGatingNFT()
            await testGatingNft.publicMint(wallet.address)

            return wallet
        } catch (e) {
            console.error('getWalletWithNft error', e)
            throw e
        }
    }

    public static async getWalletWithoutNft(): Promise<ethers.Wallet> {
        const tempWallet = ethers.Wallet.createRandom()
        const fund = provider.send('anvil_setBalance', [tempWallet.address, amount])

        const wallet = tempWallet.connect(provider)

        await fund

        return wallet
    }

    public static getUnfundedWallet(): Promise<ethers.Wallet> {
        const tempWallet = ethers.Wallet.createRandom()

        const provider = getJsonProvider()
        const wallet = tempWallet.connect(provider)

        return Promise.resolve(wallet)
    }

    public static getWalletFromPrivateKey(privateKey: string): Promise<ethers.Wallet> {
        return Promise.resolve(new ethers.Wallet(privateKey, provider))
    }
}
