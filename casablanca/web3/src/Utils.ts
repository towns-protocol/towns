import { ethers } from 'ethers'
import { getContractsInfo } from './IStaticContractsInfo'
import { MockERC721AShim } from './v3/MockERC721AShim'
import { PublicClient } from 'viem'

export class LocalhostWeb3Provider extends ethers.providers.JsonRpcProvider {
    // note to self, the wallet contains a reference to a provider, which is a circular ref back this class
    public wallet: ethers.Wallet

    public get isMetaMask() {
        return true
    }

    constructor(wallet?: ethers.Wallet, network = 'http://127.0.0.1:8545') {
        const networkUrl = network
        super(networkUrl)
        this.wallet = (wallet ?? ethers.Wallet.createRandom()).connect(this)
        console.log('initializing web3 provider with wallet', this.wallet.address)
    }

    public async fundWallet() {
        const amountInWei = ethers.BigNumber.from(10).pow(18).toHexString()

        const result = this.send('anvil_setBalance', [this.wallet.address, amountInWei])

        // console.log('fundWallet tx', result, amountInWei, this.wallet.address)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        await result
        // console.log('fundWallet receipt', receipt)
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

export function isEthersProvider(
    provider: ethers.providers.Provider | PublicClient,
): provider is ethers.providers.Provider {
    return (
        typeof provider === 'object' &&
        provider !== null &&
        'getNetwork' in provider &&
        typeof provider.getNetwork === 'function'
    )
}

export function isPublicClient(
    provider: ethers.providers.Provider | PublicClient,
): provider is PublicClient {
    return (
        typeof provider === 'object' &&
        provider !== null &&
        'getNetwork' in provider &&
        typeof provider.getNetwork !== 'function'
    )
}
