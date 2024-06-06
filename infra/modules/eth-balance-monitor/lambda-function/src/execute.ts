import { createPublicClient, http as httpViem } from 'viem'
import { Config } from './config'
import { DatadogMetrics } from './datadog'
import { RiverRegistry } from './river-registry'
import { getWalletBalances } from './wallet-balance'

// This is the main internal execution logic for the lambda. We separete it to help with development and testing.
// It accepts a Config object, which the lambda puts together from environment variables and AWS Secrets Manager.

export async function execute(config: Config) {
    const {
        baseChainRpcUrl,
        riverChainRpcUrl,
        datadogApiKey,
        datadogApplicationKey,
        environment,
        riverRegistryContractAddress,
    } = config
    const baseChainClient = createPublicClient({
        transport: httpViem(baseChainRpcUrl),
    })
    const riverChainClient = createPublicClient({
        transport: httpViem(riverChainRpcUrl),
    })

    const riverRegistry = new RiverRegistry({
        client: riverChainClient,
        address: riverRegistryContractAddress,
    })

    const nodes = await riverRegistry.getAllNodes()

    const baseChainWalletBalances = await getWalletBalances(baseChainClient, nodes, 'base')
    const riverChainWalletBalances = await getWalletBalances(riverChainClient, nodes, 'river')
    const walletBalances = riverChainWalletBalances.concat(baseChainWalletBalances)

    const datadogMetrics = new DatadogMetrics({
        apiKey: datadogApiKey,
        appKey: datadogApplicationKey,
        env: environment,
    })

    await datadogMetrics.postWalletBalances(walletBalances)
}
