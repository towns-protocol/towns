import { LocalhostWeb3Provider } from '@river-build/web3'
import { RiverConfig, makeRiverRpcClient, makeSignerContext, userIdFromAddress } from '@river/sdk'
import { ethers } from 'ethers'

export async function makeConnection(config: RiverConfig, wallet?: ethers.Wallet) {
    wallet = wallet ?? ethers.Wallet.createRandom()
    const delegateWallet = ethers.Wallet.createRandom()
    const signerContext = await makeSignerContext(wallet, delegateWallet)
    const userId = userIdFromAddress(signerContext.creatorAddress)
    const riverProvider = new LocalhostWeb3Provider(config.river.rpcUrl, wallet)
    const baseProvider = new LocalhostWeb3Provider(config.base.rpcUrl, wallet)
    const rpcClient = await makeRiverRpcClient(riverProvider, config.river.chainConfig)
    return {
        userId,
        wallet,
        delegateWallet,
        signerContext,
        config,
        baseProvider,
        riverProvider,
        rpcClient,
    }
}

export type Connection = Awaited<ReturnType<typeof makeConnection>>
