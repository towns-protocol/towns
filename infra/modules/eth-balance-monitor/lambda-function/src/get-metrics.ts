import ethers from 'ethers'
import {
    getWeb3Deployment,
    RiverRegistry,
    BaseRegistry,
    SpaceOwner,
    BaseOperator,
} from '@river-build/web3'
import { Ping } from './ping'
import { getWalletBalances } from './wallet-balance'
import { Unpromisify } from './utils'
import { NodeStructOutput } from '@river-build/generated/v3/typings/INodeRegistry'

export type RiverMetrics = Unpromisify<ReturnType<typeof getMetrics>>

export type CombinedOperator = {
    operatorAddress: string
    baseOperatorStatus: number
    riverOperatorStatus: number
}

function combineOperators(
    baseOperators: BaseOperator[],
    riverOperators: string[],
): CombinedOperator[] {
    const baseOperatorAddresses = baseOperators.map((operator) => operator.operatorAddress)
    const baseOperatorMap = new Map(
        baseOperators.map((operator) => [operator.operatorAddress, operator]),
    )
    const riverOperatorAddressSet = new Set(riverOperators)
    const allOperatorAddressesSet = new Set(riverOperators.concat(baseOperatorAddresses))
    const allOperatorAddresses = Array.from(allOperatorAddressesSet)
    const combinedOperators: CombinedOperator[] = allOperatorAddresses.map((operatorAddress) => {
        const baseOperator = baseOperatorMap.get(operatorAddress)
        let baseOperatorStatus = -1 // -1 means not found
        if (baseOperator) {
            baseOperatorStatus = baseOperator.status
        }

        const riverOperatorStatus = riverOperatorAddressSet.has(operatorAddress) ? 1 : -1
        return {
            operatorAddress,
            baseOperatorStatus,
            riverOperatorStatus,
        }
    })
    return combinedOperators
}

export type CombinedNode = {
    nodeAddress: string
    baseStatus: number
    baseOperator: string
    riverStatus: number
    riverOperator: string
    url?: string
    isMissingOnRiver: boolean
    isMissingOnBase: boolean
}

function combineNodes(nodesOnBase: string[], nodesOnRiver: NodeStructOutput[]): CombinedNode[] {
    const nodesOnRiverAddresses = nodesOnRiver.map((node) => node.nodeAddress)
    const nodesOnRiverMap = new Map(nodesOnRiver.map((node) => [node.nodeAddress, node]))
    const nodesOnBaseSet = new Set(nodesOnBase)
    const allNodeAddressesSet = new Set(nodesOnBase.concat(nodesOnRiverAddresses))
    const allNodeAddresses = Array.from(allNodeAddressesSet)
    const combinedNodes = allNodeAddresses.map((nodeAddress) => {
        const nodeOnRiver = nodesOnRiverMap.get(nodeAddress)
        let riverStatus = -1 // -1 means not found
        let riverOperator = 'unknown'
        let url: string | undefined
        let baseOperator = 'unknown'
        if (nodeOnRiver) {
            riverStatus = nodeOnRiver.status
            riverOperator = nodeOnRiver.operator
            url = nodeOnRiver.url
        }

        // TODO: enhance via operators on base (https://github.com/river-build/river/pull/272)

        const baseStatus = nodesOnBaseSet.has(nodeAddress) ? 1 : -1
        const isOnRiver = riverStatus > -1 && riverStatus < 3 // ignore FAILED, DEPARTING, DELETED

        return {
            nodeAddress,
            baseStatus,
            riverStatus,
            riverOperator,
            baseOperator,
            url,
            isMissingOnRiver: baseStatus > -1 && riverStatus === -1,
            isMissingOnBase: isOnRiver && baseStatus === -1,
        }
    })
    return combinedNodes
}

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
    const numTotalSpacesBigNumber = await spaceOwner.getNumTotalSpaces()
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

    const combinedOperators = combineOperators(operatorsOnBase, operatorsOnRiver)
    console.log('combined operators:', combinedOperators)

    const combinedNodes = combineNodes(nodesOnBase, nodesOnRiver)
    console.log('combined nodes:', combinedNodes)

    const ping = new Ping(combinedNodes)

    console.log('pinging nodes')
    const nodePingResults = await ping.pingNodes()
    console.log('pinged nodes')

    const numUnhealthyPings = nodePingResults.filter(({ ping }) => ping.kind === 'error').length

    const missingNodesOnRiver = combinedNodes.filter((node) => node.isMissingOnRiver)
    const missingNodesOnBase = combinedNodes.filter((node) => node.isMissingOnBase)
    const numMissingNodesOnRiver = missingNodesOnRiver.length
    const numMissingNodesOnBase = missingNodesOnBase.length

    return {
        walletBalances,
        nodePingResults,
        // nodesOnRiverWithStreamCounts,
        combinedNodes,
        combinedOperators,
        aggregateNetworkStats: {
            numTotalSpaces,
            numTotalStreams,
            numTotalNodesOnBase,
            numTotalNodesOnRiver,
            numTotalOperatorsOnBase,
            numTotalOperatorsOnRiver,
            numMissingNodesOnBase,
            numMissingNodesOnRiver,
            numUnhealthyPings,
        },
    }
}
