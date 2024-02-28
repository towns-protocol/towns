/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */

import { Wallet, ethers } from 'ethers'
import { getContractsInfo } from '../src/IStaticContractsInfo'
import { Versions } from '../src/ContractTypes'
import { MockERC721AShim as MockERC721AShimV3 } from '../src/v3'

export class TestWeb3Provider extends ethers.providers.JsonRpcProvider {
    // note to self, the wallet contains a reference to a provider, which is a circular ref back this class
    public wallet: ethers.Wallet
    private version: Versions

    public get isMetaMask() {
        return true
    }

    constructor(wallet?: Wallet, version: Versions = 'v3') {
        const networkUrl = process.env.RPC_URL!
        super(networkUrl)
        this.wallet = (wallet ?? ethers.Wallet.createRandom()).connect(this)
        this.version = version
        console.log('initializing web3 provider with wallet', this.wallet.address)
    }

    public async fundWallet(walletToFund: ethers.Wallet | string = this.wallet) {
        const amountInWei = ethers.BigNumber.from(100).pow(18).toHexString()
        const address = typeof walletToFund === 'string' ? walletToFund : walletToFund.address
        const result = this.send('anvil_setBalance', [address, amountInWei])
        console.log('fundWallet tx', result, amountInWei, address)
        const receipt = await result
        console.log('fundWallet receipt', receipt)
        const balance = await this.getBalance(address)
        console.log('fundWallet balance', balance.toString())
        return true
    }

    /**
     * Mint a mock NFT for the current wallet
     * required for the wallet to be able to create a town
     */
    public async mintMockNFT(walletToMint: string | ethers.Wallet = this.wallet) {
        await this.ready
        const address = typeof walletToMint === 'string' ? walletToMint : walletToMint.address
        await this.fundWallet(address)
        const chainId = this.network.chainId
        const mockNFTAddress = getContractsInfo(chainId).mockErc721aAddress
        // TODO: add V4 compat
        const mockNFT = new MockERC721AShimV3(mockNFTAddress, chainId, this)
        return mockNFT.write(this.wallet).mintTo(address)
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

    static async init({ version = 'v3', wallet }: { version?: Versions; wallet?: Wallet } = {}) {
        const provider = new TestWeb3Provider(wallet, version)
        await provider.ready
        return provider
    }
}
