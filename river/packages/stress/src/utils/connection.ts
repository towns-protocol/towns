/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { check } from '@river-build/dlog'
import { LocalhostWeb3Provider, createRiverRegistry } from '@river-build/web3'
import {
    RiverConfig,
    makeSignerContext,
    userIdFromAddress,
    randomUrlSelector,
} from '@river-build/sdk'
import { makeStreamRpcClient } from './rpc-http2'
import { ethers } from 'ethers'

export async function makeConnection(config: RiverConfig, wallet?: ethers.Wallet) {
    wallet = wallet ?? ethers.Wallet.createRandom()
    const delegateWallet = ethers.Wallet.createRandom()
    const signerContext = await makeSignerContext(wallet, delegateWallet)
    const userId = userIdFromAddress(signerContext.creatorAddress)
    check(userId === wallet.address, `userId !== wallet.address ${userId} !== ${wallet.address}`)
    const riverProvider = new LocalhostWeb3Provider(config.river.rpcUrl, wallet)
    const baseProvider = new LocalhostWeb3Provider(config.base.rpcUrl, wallet)
    const riverRegistry = createRiverRegistry(riverProvider, config.river.chainConfig)
    const urls = await riverRegistry.getOperationalNodeUrls()
    const selectedUrl = randomUrlSelector(urls)
    const rpcClient = makeStreamRpcClient(selectedUrl, () => riverRegistry.getOperationalNodeUrls())
    return {
        userId,
        delegateWallet,
        signerContext,
        baseProvider,
        riverProvider,
        rpcClient,
    }
}
