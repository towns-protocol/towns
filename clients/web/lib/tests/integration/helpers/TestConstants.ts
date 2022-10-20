/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ethers } from 'ethers'

export class TestConstants {
    static FUNDED_WALLET_0: ethers.Wallet

    static init() {
        const network = process.env.ETHERS_NETWORK!
        const privateKey = process.env.FUNDED_WALLET_PRIVATE_KEY_0!
        const provider = new ethers.providers.JsonRpcProvider(network)
        this.FUNDED_WALLET_0 = new ethers.Wallet(privateKey, provider)
    }
}
