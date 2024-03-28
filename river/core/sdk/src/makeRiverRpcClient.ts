import { DappConfig, Versions, createRiverRegistry } from '@river-build/web3'
import { RetryParams, StreamRpcClient, makeStreamRpcClient } from './makeStreamRpcClient'

export async function makeRiverRpcClient(
    config: DappConfig,
    version?: Versions,
    retryParams?: RetryParams,
): Promise<StreamRpcClient> {
    const riverRegistry = createRiverRegistry({ ...config }, version)
    const urls = await riverRegistry.getOperationalNodeUrls()
    const rpcClient = makeStreamRpcClient(urls, retryParams, () =>
        riverRegistry.getOperationalNodeUrls(),
    )
    return rpcClient
}
