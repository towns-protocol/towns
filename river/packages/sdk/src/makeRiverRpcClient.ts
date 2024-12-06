import { RiverChainConfig, createRiverRegistry } from '@river-build/web3'
import { StreamRpcClient, makeStreamRpcClient } from './makeStreamRpcClient'
import { ethers } from 'ethers'
import { RpcOptions } from './rpcCommon'

export async function makeRiverRpcClient(
    provider: ethers.providers.Provider,
    config: RiverChainConfig,
    opts?: RpcOptions,
): Promise<StreamRpcClient> {
    const riverRegistry = createRiverRegistry(provider, config)
    const urls = await riverRegistry.getOperationalNodeUrls()
    const rpcClient = makeStreamRpcClient(urls, () => riverRegistry.getOperationalNodeUrls(), opts)
    return rpcClient
}
