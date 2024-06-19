import { createPublicClient, http as httpViem } from 'viem'
import { Config } from './config'
import { DatadogMetrics } from './datadog'
import { RiverRegistry } from './river-registry'
import { getWalletBalances } from './wallet-balance'
import { Ping } from './ping'
import { BaseRegistry } from './base-registry'
import { SpaceOwner } from './space-owner'

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
        baseRegistryContractAddress,
        spaceOwnerContractAddress,
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

    const baseRegistry = new BaseRegistry({
        client: baseChainClient,
        address: baseRegistryContractAddress,
    })

    const spaceOwner = new SpaceOwner({
        client: baseChainClient,
        address: spaceOwnerContractAddress,
    })

    const datadogMetrics = new DatadogMetrics({
        apiKey: datadogApiKey,
        appKey: datadogApplicationKey,
        env: environment,
    })

    const nodesOnRiver = await riverRegistry.getAllNodes()
    // TODO: uncomment once working
    // const nodesOnRiverWithStreamCounts = await riverRegistry.getStreamCountsOnNodes(nodesOnRiver)
    const nodesOnBase = await baseRegistry.getNodes()
    const operatorsOnBase = await baseRegistry.getOperators()

    const numTotalSpaces = await spaceOwner.totalSupply()
    const numTotalNodesOnBase = nodesOnBase.length
    const numTotalNodesOnRiver = nodesOnRiver.length
    const numTotalOperatorsOnBase = operatorsOnBase.length

    const baseChainWalletBalances = await getWalletBalances(baseChainClient, nodesOnRiver, 'base')
    const riverChainWalletBalances = await getWalletBalances(
        riverChainClient,
        nodesOnRiver,
        'river',
    )
    const walletBalances = riverChainWalletBalances.concat(baseChainWalletBalances)

    const ping = new Ping(nodesOnRiver)

    const nodePingResults = await ping.pingNodes()

    await datadogMetrics.postWalletBalances(walletBalances)
    await datadogMetrics.postNodeStatusList(nodesOnRiver)
    await datadogMetrics.postNodePingResults(nodePingResults)
    // await datadogMetrics.postNodeStreamCounts(nodesOnRiverWithStreamCounts)
    await datadogMetrics.postBaseOperatorStatus(operatorsOnBase)
    await datadogMetrics.postAggregateNetworkStats({
        numTotalSpaces,
        numTotalNodesOnBase,
        numTotalNodesOnRiver,
        numTotalOperatorsOnBase,
    })
}
