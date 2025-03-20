import {
    getWeb3Deployment,
    RiverRegistry,
    BaseRegistry,
    SpaceOwner,
    SpaceDapp,
    ISpaceOwnerBase,
} from '@towns-protocol/web3'
import { ethers } from 'ethers'
import { Ping as Pinger } from './pinger'
import { getWalletBalances } from './wallet-balance'
import { NodeStructOutput } from '@towns-protocol/generated/dev/typings/INodeRegistry'
import { Unpromisify } from './utils'
import { MetricsIntegrator } from './metrics-integrator'
import { IERC721ABase } from '@towns-protocol/generated/dev/typings/IERC721AQueryable'

const NUM_RETRIES = 3
const THROTTLE_LIMIT = 250 // num requests
const THROTTLE_INTERVAL = 1000 // per ms
const CONCURRENCY = 250

const NUM_SPACE_PER_LOG = 100

export type MetricsExtractorScrapeConfig = {
    getSpaceMemberships: boolean
    getSpaceInfo: boolean
}

export type MetricsExtractorConfig = {
    baseChainRpcUrl: string
    riverChainRpcUrl: string
    environment: string
    getSpaceInfo: boolean
}

export type NodeMetrics = Unpromisify<
    ReturnType<typeof MetricsExtractor.prototype.extractNodeMetrics>
>

export type SpaceWithTokenOwners = {
    address: string
    spaceInfo?: ISpaceOwnerBase.SpaceStruct
    numMemberships: number
    tokenOwnerships: IERC721ABase.TokenOwnershipStructOutput[]
    isPriced: boolean
    numPaidMemberships: number
    pricingModule: string
}

export class MetricsExtractor {
    constructor(
        private readonly baseChainProvider: ethers.providers.JsonRpcProvider,
        private readonly riverChainProvider: ethers.providers.JsonRpcProvider,
        private readonly riverRegistry: RiverRegistry,
        private readonly baseRegistry: BaseRegistry,
        private readonly pinger: Pinger,
        private readonly integrator: MetricsIntegrator,
    ) {}

    public static init(config: MetricsExtractorConfig) {
        const baseChainProvider = new ethers.providers.JsonRpcProvider(config.baseChainRpcUrl)
        const riverChainProvider = new ethers.providers.JsonRpcProvider(config.riverChainRpcUrl)
        const deployment = getWeb3Deployment(config.environment)
        const riverRegistry = new RiverRegistry(deployment.river, riverChainProvider)
        const baseRegistry = new BaseRegistry(deployment.base, baseChainProvider)
        const pinger = new Pinger()
        const metricsIntegrator = new MetricsIntegrator()

        return new MetricsExtractor(
            baseChainProvider,
            riverChainProvider,
            riverRegistry,
            baseRegistry,
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

    private async getNodes() {
        const [nodesOnRiver, nodesOnBase, operatorsOnBase, operatorsOnRiver] = await Promise.all([
            this.getNodesOnRiver(),
            this.getNodesOnBase(),
            this.getOperatorsOnBase(),
            this.getOperatorsOnRiver(),
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
        return {
            nodesOnRiver,
            nodesOnBase,
            operatorsOnBase,
            operatorsOnRiver,
            combinedNodes,
            combinedOperators,
            combinedNodesWithOperators,
            combinedOperatorsWithNodes,
        }
    }

    public async extractNodeMetrics() {
        const {
            nodesOnRiver,
            nodesOnBase,
            operatorsOnBase,
            operatorsOnRiver,
            combinedNodes,
            combinedOperators,
            combinedNodesWithOperators,
            combinedOperatorsWithNodes,
        } = await this.getNodes()

        const [baseChainWalletBalances, riverChainWalletBalances, nodePingResults] =
            await Promise.all([
                this.getBaseChainWalletBalances(nodesOnRiver),
                this.getRiverChainWalletBalances(nodesOnRiver),
                this.pinger.pingNodes(combinedNodes),
            ])

        const walletBalances = riverChainWalletBalances.concat(baseChainWalletBalances)
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
            aggregateNodeStats: {
                numTotalNodesOnBase,
                numTotalNodesOnRiver,
                numTotalOperatorsOnBase,
                numTotalOperatorsOnRiver,
                numMissingNodesOnBase,
                numMissingNodesOnRiver,
            },
        }
    }
}
