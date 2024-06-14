import { check } from '@river-build/dlog'
import { LocalhostWeb3Provider } from '@river-build/web3'
import { RiverConfig, makeRiverRpcClient, makeSignerContext, userIdFromAddress } from '@river/sdk'
import { ethers } from 'ethers'

export async function makeConnection(config: RiverConfig, wallet?: ethers.Wallet) {
    wallet = wallet ?? ethers.Wallet.createRandom()
    const delegateWallet = ethers.Wallet.createRandom()
    const signerContext = await makeSignerContext(wallet, delegateWallet)
    const userId = userIdFromAddress(signerContext.creatorAddress)
    check(userId === wallet.address, `userId !== wallet.address ${userId} !== ${wallet.address}`)
    const riverProvider = new LocalhostWeb3Provider(config.river.rpcUrl, wallet)
    const baseProvider = new LocalhostWeb3Provider(config.base.rpcUrl, wallet)
    const rpcClient = await makeRiverRpcClient(riverProvider, config.river.chainConfig)
    return {
        userId,
        delegateWallet,
        signerContext,
        baseProvider,
        riverProvider,
        rpcClient,
    }
}
