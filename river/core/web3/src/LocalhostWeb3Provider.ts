import { ethers } from 'ethers'
import { dlogger } from '@river-build/dlog'
import { BaseChainConfig } from './IStaticContractsInfo'
import { mintMockNFT } from './ContractHelpers'

const logger = dlogger('csb:LocalhostWeb3Provider')

// Behaves like a metamask provider
export class LocalhostWeb3Provider extends ethers.providers.JsonRpcProvider {
    // note to self, the wallet contains a reference to a provider, which is a circular ref back this class
    public wallet: ethers.Wallet

    public get isMetaMask() {
        return true
    }

    constructor(rpcUrl: string, wallet?: ethers.Wallet) {
        super(rpcUrl)
        this.wallet = (wallet ?? ethers.Wallet.createRandom()).connect(this)
        logger.log('initializing web3 provider with wallet', this.wallet.address)
    }

    public async fundWallet(walletToFund: ethers.Wallet | string = this.wallet) {
        const amountInWei = ethers.BigNumber.from(100).pow(18).toHexString()
        const address = typeof walletToFund === 'string' ? walletToFund : walletToFund.address
        const result = this.send('anvil_setBalance', [address, amountInWei])
        logger.log('fundWallet tx', result, amountInWei, address)
        const receipt = await result
        logger.log('fundWallet receipt', receipt)
        const balance = await this.getBalance(address)
        logger.log('fundWallet balance', balance.toString())
        return true
    }

    public async mintMockNFT(config: BaseChainConfig) {
        return mintMockNFT(this, config, this.wallet, this.wallet.address)
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
