/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */

import { Wallet, ethers } from 'ethers'

import { fundWallet } from './TestUtils'
import { getContractsInfo, MockERC721AShim } from '@river/web3'

export class TownsTestWeb3Provider extends ethers.providers.JsonRpcProvider {
    // note to self, the wallet contains a reference to a provider, which is a circular ref back this class
    public wallet: ethers.Wallet

    public get isMetaMask() {
        return true
    }

    constructor(wallet?: Wallet) {
        const networkUrl = process.env.ETHERS_NETWORK!
        super(networkUrl)
        this.wallet = (wallet ?? ethers.Wallet.createRandom()).connect(this)
        console.log('initializing web3 provider with wallet', this.wallet.address)
    }

    public async fundWallet() {
        await fundWallet(this.wallet)
        return this.wallet
    }

    /**
     * Mint a mock NFT for the current wallet
     * required for the wallet to be able to create a town
     */
    public async mintMockNFT() {
        await this.ready
        const chainId = this.network.chainId
        const mockNFTAddress = getContractsInfo(chainId).mockErc721aAddress
        const mockNFT = new MockERC721AShim(mockNFTAddress, chainId, this)
        return mockNFT.write(this.wallet).mintTo(this.wallet.address)
    }

    public async request({
        method,
        params = [] as unknown[],
    }: {
        method: string
        params?: unknown[]
    }) {
        if (method === 'eth_requestAccounts') {
            return [this.wallet.address]
        } else if (method === 'eth_accounts') {
            return [this.wallet.address]
        } else if (method === 'personal_sign') {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const [message, address] = params as [string, string]
            if (ethers.utils.isHexString(message)) {
                // the json rpc provider will hexify the message, so we need to unhexify it
                const m1 = ethers.utils.arrayify(message)
                const m2 = ethers.utils.toUtf8String(m1)
                return this.wallet.signMessage(m2)
            } else {
                return this.wallet.signMessage(message)
            }
        } else {
            return this.send(method, params)
        }
    }
}
