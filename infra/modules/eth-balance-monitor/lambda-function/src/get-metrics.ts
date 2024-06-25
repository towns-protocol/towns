import ethers from 'ethers'
import { getWeb3Deployment, RiverRegistry, BaseRegistry, SpaceOwner } from '@river-build/web3'
import { Ping } from './ping'
import { getWalletBalances } from './wallet-balance'
import { Unpromisify } from './utils'

export type RiverMetrics = Unpromisify<ReturnType<typeof getMetrics>>

export async function getMetrics({
    baseChainRpcUrl,
    riverChainRpcUrl,
    environment,
}: {
    baseChainRpcUrl: string
    riverChainRpcUrl: string
    environment: string
}) {
    const baseChainProvider = new ethers.providers.JsonRpcProvider(baseChainRpcUrl)
    const riverChainProvider = new ethers.providers.JsonRpcProvider(riverChainRpcUrl)

    const deployment = getWeb3Deployment(environment)

    const riverRegistry = new RiverRegistry(deployment.river, riverChainProvider)
    const baseRegistry = new BaseRegistry(deployment.base, baseChainProvider)
    const spaceOwner = new SpaceOwner(deployment.base, baseChainProvider)

    console.log('getting river nodes')
    const riverNodesMap = await riverRegistry.getAllNodes()
    if (!riverNodesMap) {
        throw new Error('No nodes found on river chain')
    }
    console.log('got river nodes')
    const nodesOnRiver = Object.values(riverNodesMap)
    console.log('getting base nodes')
    const nodesOnBase = await baseRegistry.getNodes()
    console.log('got base nodes')
    console.log('getting operators on base')
    const operatorsOnBase = await baseRegistry.getOperators()
    console.log('got operators on base')
    console.log('getting operators on river')
    const operatorsOnRiver = await riverRegistry.operatorRegistry.read.getAllOperators()
    console.log('got operators on river')

    // TODO: uncomment to get stream counts on river
    // const riverNodeAddresses = nodesOnRiver.map((node) => node.nodeAddress)
    // console.log('getting stream counts on river')
    // const streamCountsOnRiver = await riverRegistry.getStreamCountsOnNodes(riverNodeAddresses)
    // console.log('got stream counts on river')
    // const nodesOnRiverWithStreamCounts = nodesOnRiver.map((node, index) => {
    //     const streamCount = streamCountsOnRiver[index]
    //     return { node, streamCount: Number(streamCount) }
    // })

    console.log('getting total spaces')
    const numTotalSpacesBigNumber = await spaceOwner.getNumTotalMemberships() // TODO: this method should actually read: getNumTotalSpaces. this is the wrong method name
    console.log('got total spaces')
    const numTotalSpaces = Number(numTotalSpacesBigNumber)
    const numTotalNodesOnBase = nodesOnBase.length
    const numTotalNodesOnRiver = nodesOnRiver.length
    const numTotalOperatorsOnBase = operatorsOnBase.length
    const numTotalOperatorsOnRiver = operatorsOnRiver.length

    console.log('getting num total streams')
    const numTotalStreamsBigNumber = await riverRegistry.streamRegistry.read.getStreamCount()
    const numTotalStreams = Number(numTotalStreamsBigNumber)
    console.log('got num total streams')

    console.log('getting wallet balances on base')
    const baseChainWalletBalances = await getWalletBalances(baseChainProvider, nodesOnRiver, 'base')
    console.log('got wallet balances on base')

    console.log('getting wallet balances on river')
    const riverChainWalletBalances = await getWalletBalances(
        riverChainProvider,
        nodesOnRiver,
        'river',
    )
    console.log('got wallet balances on river')
    const walletBalances = riverChainWalletBalances.concat(baseChainWalletBalances)

    const ping = new Ping(nodesOnRiver)

    console.log('pinging nodes')
    const nodePingResults = await ping.pingNodes()
    console.log('pinged nodes')

    return {
        walletBalances,
        nodesOnRiver,
        nodePingResults,
        // nodesOnRiverWithStreamCounts,
        operatorsOnBase,
        operatorsOnRiver,
        aggregateNetworkStats: {
            numTotalSpaces,
            numTotalNodesOnBase,
            numTotalNodesOnRiver,
            numTotalOperatorsOnBase,
            numTotalOperatorsOnRiver,
            numTotalStreams,
        },
    }
}
