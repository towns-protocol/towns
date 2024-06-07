import { RiverChainConfig, createRiverRegistry } from '@river-build/web3'
import { RetryParams, StreamRpcClient, makeStreamRpcClient } from './makeStreamRpcClient'
import { ethers } from 'ethers'

export async function makeRiverRpcClient(
    provider: ethers.providers.Provider,
    config: RiverChainConfig,
    retryParams?: RetryParams,
): Promise<StreamRpcClient> {
    const riverRegistry = createRiverRegistry(provider, config)
    const urls = await riverRegistry.getOperationalNodeUrls()
    const rpcClient = makeStreamRpcClient(urls, retryParams, () =>
        riverRegistry.getOperationalNodeUrls(),
    )
    return rpcClient
}
