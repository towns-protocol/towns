/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ethers } from 'ethers'

export class TestConstants {
    private static _funded_wallet_0: ethers.Wallet | undefined
    public static get FUNDED_WALLET_0(): ethers.Wallet {
        if (!this._funded_wallet_0) {
            const network = process.env.ETHERS_NETWORK!
            const privateKey = process.env.FUNDED_WALLET_PRIVATE_KEY_0!
            const provider = new ethers.providers.JsonRpcProvider(network)
            this._funded_wallet_0 = new ethers.Wallet(privateKey, provider)
        }
        return this._funded_wallet_0
    }
}
