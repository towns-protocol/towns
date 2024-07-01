import { getWeb3Deployment, RiverRegistry, BaseRegistry, SpaceOwner } from '@river-build/web3'
import { ethers } from 'ethers'
import { Ping as Pinger } from './pinger'
import { getWalletBalances } from './wallet-balance'
import { NodeStructOutput } from '@river-build/generated/dev/typings/INodeRegistry'
import { Unpromisify } from './utils'
import { MetricsIntegrator } from './metrics-integrator'

export type MetricsExtractorConfig = {
    baseChainRpcUrl: string
    riverChainRpcUrl: string
    environment: string
}

export type RiverMetrics = Unpromisify<ReturnType<typeof MetricsExtractor.prototype.extract>>

export class MetricsExtractor {
    constructor(
        private readonly baseChainProvider: ethers.providers.JsonRpcProvider,
        private readonly riverChainProvider: ethers.providers.JsonRpcProvider,
        private readonly riverRegistry: RiverRegistry,
        private readonly baseRegistry: BaseRegistry,
        private readonly spaceOwner: SpaceOwner,
        private readonly pinger: Pinger,
        private readonly integrator: MetricsIntegrator,
    ) {}

    public static init(config: MetricsExtractorConfig) {
        const baseChainProvider = new ethers.providers.JsonRpcProvider(config.baseChainRpcUrl)
        const riverChainProvider = new ethers.providers.JsonRpcProvider(config.riverChainRpcUrl)
        const deployment = getWeb3Deployment(config.environment)
        const riverRegistry = new RiverRegistry(deployment.river, riverChainProvider)
        const baseRegistry = new BaseRegistry(deployment.base, baseChainProvider)
        const spaceOwner = new SpaceOwner(deployment.base, baseChainProvider)
        const pinger = new Pinger()
        const metricsIntegrator = new MetricsIntegrator()

        return new MetricsExtractor(
            baseChainProvider,
            riverChainProvider,
            riverRegistry,
            baseRegistry,
            spaceOwner,
            pinger,
            metricsIntegrator,
        )
    }

    private async getNodesOnRiver() {
        console.log('getting river nodes')
        const riverNodesMap = await this.riverRegistry.getAllNodes()
        if (!riverNodesMap) {
            throw new Error('No nodes found on river chain')
        }
        console.log('got river nodes')

        return Object.values(riverNodesMap)
    }

    private async getNodesOnBase() {
        console.log('getting base nodes')
        const nodesOnBase = await this.baseRegistry.getNodesWithOperators()
        console.log('got base nodes')
        return nodesOnBase
    }

    private async getOperatorsOnBase() {
        console.log('getting operators on base')
        const operatorsOnBase = await this.baseRegistry.getOperators()
        console.log('got operators on base')
        return operatorsOnBase
    }

    private async getOperatorsOnRiver() {
        console.log('getting operators on river')
        const operatorsOnRiver = await this.riverRegistry.operatorRegistry.read.getAllOperators()
        console.log('got operators on river')
        return operatorsOnRiver
    }

    private async getStreamCountsOnRiver() {
        // TODO: uncomment to get stream counts on river
        // const riverNodeAddresses = nodesOnRiver.map((node) => node.nodeAddress)
        // console.log('getting stream counts on river')
        // const streamCountsOnRiver = await riverRegistry.getStreamCountsOnNodes(riverNodeAddresses)
        // console.log('got stream counts on river')
        // const nodesOnRiverWithStreamCounts = nodesOnRiver.map((node, index) => {
        //     const streamCount = streamCountsOnRiver[index]
        //     return { node, streamCount: Number(streamCount) }
        // })
    }

    private async getNumTotalSpaces() {
        console.log('getting total spaces')
        const numTotalSpacesBigNumber = await this.spaceOwner.getNumTotalSpaces()
        console.log('got total spaces')
        const numTotalSpaces = Number(numTotalSpacesBigNumber)
        return numTotalSpaces
    }

    private async getNumTotalStreams() {
        console.log('getting num total streams')
        const numTotalStreamsBigNumber =
            await this.riverRegistry.streamRegistry.read.getStreamCount()
        const numTotalStreams = Number(numTotalStreamsBigNumber)
        console.log('got num total streams')
        return numTotalStreams
    }

    private async getBaseChainWalletBalances(nodesOnRiver: NodeStructOutput[]) {
        console.log('getting wallet balances on base')
        const baseChainWalletBalances = await getWalletBalances(
            this.baseChainProvider,
            nodesOnRiver,
            'base',
        )
        console.log('got wallet balances on base')
        return baseChainWalletBalances
    }

    private async getRiverChainWalletBalances(nodesOnRiver: NodeStructOutput[]) {
        console.log('getting wallet balances on river')
        const riverChainWalletBalances = await getWalletBalances(
            this.riverChainProvider,
            nodesOnRiver,
            'river',
        )
        console.log('got wallet balances on river')
        return riverChainWalletBalances
    }

    async extract() {
        const [
            nodesOnRiver,
            nodesOnBase,
            operatorsOnBase,
            operatorsOnRiver,
            numTotalSpaces,
            numTotalStreams,
        ] = await Promise.all([
            this.getNodesOnRiver(),
            this.getNodesOnBase(),
            this.getOperatorsOnBase(),
            this.getOperatorsOnRiver(),
            this.getNumTotalSpaces(),
            this.getNumTotalStreams(),
        ])

        const combinedNodes = this.integrator.combineNodes(nodesOnBase, nodesOnRiver)
        const combinedOperators = this.integrator.combineOperators(
            operatorsOnBase,
            operatorsOnRiver,
        )
        const combinedNodesWithOperators = this.integrator.enrichNodesWithOperators(
            combinedNodes,
            combinedOperators,
        )
        const combinedOperatorsWithNodes = this.integrator.enrichOperatorsWithNodes(
            combinedOperators,
            combinedNodes,
        )

        const [baseChainWalletBalances, riverChainWalletBalances, nodePingResults] =
            await Promise.all([
                this.getBaseChainWalletBalances(nodesOnRiver),
                this.getRiverChainWalletBalances(nodesOnRiver),
                this.pinger.pingNodes(combinedNodes),
            ])

        const walletBalances = riverChainWalletBalances.concat(baseChainWalletBalances)
        const numUnhealthyPings = nodePingResults.filter(({ ping }) => ping.kind === 'error').length
        const missingNodesOnRiver = combinedNodes.filter((node) => node.isMissingOnRiver)
        const missingNodesOnBase = combinedNodes.filter((node) => node.isMissingOnBase)
        const numMissingNodesOnRiver = missingNodesOnRiver.length
        const numMissingNodesOnBase = missingNodesOnBase.length
        const numTotalNodesOnBase = nodesOnBase.length
        const numTotalNodesOnRiver = nodesOnRiver.length
        const numTotalOperatorsOnBase = operatorsOnBase.filter(
            (operator) => operator.status === 3, // 3 is the status for approved operators
        ).length
        const numTotalOperatorsOnRiver = operatorsOnRiver.length

        return {
            walletBalances,
            nodePingResults,
            combinedNodes,
            combinedOperators,
            combinedNodesWithOperators,
            combinedOperatorsWithNodes,
            nodesOnBase,
            nodesOnRiver,
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
}
