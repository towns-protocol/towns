import {
    getWeb3Deployment,
    RiverRegistry,
    BaseRegistry,
    SpaceOwner,
    SpaceRegistrar,
    Space,
} from '@river-build/web3'
import { ethers } from 'ethers'
import { Ping as Pinger } from './pinger'
import { getWalletBalances } from './wallet-balance'
import { NodeStructOutput } from '@river-build/generated/dev/typings/INodeRegistry'
import { Unpromisify } from './utils'
import { MetricsIntegrator } from './metrics-integrator'

export type MetricsExtractorScrapeConfig = {
    getTotalSpaceMemberships: boolean
}

export type MetricsExtractorConfig = {
    baseChainRpcUrl: string
    riverChainRpcUrl: string
    environment: string
}

export type RiverMetrics = Unpromisify<ReturnType<typeof MetricsExtractor.prototype.extract>>

export type SpaceWithMemberships = {
    address: string
    memberships: number
}

export class MetricsExtractor {
    constructor(
        private readonly baseChainProvider: ethers.providers.JsonRpcProvider,
        private readonly riverChainProvider: ethers.providers.JsonRpcProvider,
        private readonly riverRegistry: RiverRegistry,
        private readonly baseRegistry: BaseRegistry,
        private readonly spaceOwner: SpaceOwner,
        private readonly spaceRegistrar: SpaceRegistrar,
        private readonly pinger: Pinger,
        private readonly integrator: MetricsIntegrator,
        private readonly scrapeConfig: MetricsExtractorScrapeConfig,
    ) {}

    public static init(config: MetricsExtractorConfig) {
        const baseChainProvider = new ethers.providers.JsonRpcProvider(config.baseChainRpcUrl)
        const riverChainProvider = new ethers.providers.JsonRpcProvider(config.riverChainRpcUrl)
        const deployment = getWeb3Deployment(config.environment)
        const riverRegistry = new RiverRegistry(deployment.river, riverChainProvider)
        const baseRegistry = new BaseRegistry(deployment.base, baseChainProvider)
        const spaceOwner = new SpaceOwner(deployment.base, baseChainProvider)
        const spaceRegistrar = new SpaceRegistrar(deployment.base, baseChainProvider)
        const pinger = new Pinger()
        const metricsIntegrator = new MetricsIntegrator()
        const scrapeConfig = {
            getTotalSpaceMemberships: config.environment === 'omega', // this is an incredibly expensive query, so we only do it for omega
        }

        return new MetricsExtractor(
            baseChainProvider,
            riverChainProvider,
            riverRegistry,
            baseRegistry,
            spaceOwner,
            spaceRegistrar,
            pinger,
            metricsIntegrator,
            scrapeConfig,
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

    private async getSpaceWithMembershipsByTokenId(tokenId: number): Promise<SpaceWithMemberships> {
        const spaceAddress = await this.spaceRegistrar.SpaceArchitect.read.getSpaceByTokenId(
            tokenId,
        )
        const space = this.spaceRegistrar.getSpace(spaceAddress)!
        const membershipsBigInt = await space.Membership.read.totalSupply()
        const memberships = membershipsBigInt.toNumber()
        return {
            address: spaceAddress,
            memberships,
        }
    }

    private async getSpacesWithMembershipsByTokenIds(
        tokenIds: number[],
    ): Promise<SpaceWithMemberships[]> {
        return await Promise.all(
            tokenIds.map(async (tokenId) => {
                return this.getSpaceWithMembershipsByTokenId(tokenId)
            }),
        )
    }

    private async getSpacesWithMembershipsByTokenIdsWithRetries(
        tokenIds: number[],
        attempts: number,
    ): Promise<SpaceWithMemberships[]> {
        let error: unknown
        while (attempts > 0) {
            try {
                return await this.getSpacesWithMembershipsByTokenIds(tokenIds)
            } catch (e) {
                error = e
                if (attempts > 0) {
                    console.error(`Error getting space memberships, retrying...`, e)
                    attempts--
                }
            }
        }
        throw error
    }

    private async getAllSpacesWithMemberships(numTotalSpaces: number) {
        if (!this.scrapeConfig.getTotalSpaceMemberships) {
            return {
                kind: 'skipped' as const,
            }
        }
        console.log('getting space memberships')

        const tokenIds = Array.from({ length: numTotalSpaces }, (_, i) => i)

        // prepare token id batches:
        const BATCH_SIZE = 200
        const NUM_ATTEMPTS = 3

        const batches = []
        for (let i = 0; i < tokenIds.length; i += BATCH_SIZE) {
            batches.push(tokenIds.slice(i, i + BATCH_SIZE))
        }

        const spacesWithMemberships: SpaceWithMemberships[][] = []

        for (let i = 0; i < batches.length; i++) {
            console.log(`getting space memberships for batch ${i}`)
            const currentBatchSpaces = await this.getSpacesWithMembershipsByTokenIdsWithRetries(
                batches[i],
                NUM_ATTEMPTS,
            )
            spacesWithMemberships.push(currentBatchSpaces)
        }

        console.log('got space memberships')
        console.log('flattening space memberships')

        const result = spacesWithMemberships.flat()
        console.log('flattened space memberships')
        console.log('sorting space memberships')
        result.sort((a, b) => b.memberships - a.memberships) // sort by memberships in descending order
        console.log('sorted space memberships')

        return {
            kind: 'success' as const,
            result,
        }
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

        const [
            baseChainWalletBalances,
            riverChainWalletBalances,
            nodePingResults,
            spacesWithMemberships,
        ] = await Promise.all([
            this.getBaseChainWalletBalances(nodesOnRiver),
            this.getRiverChainWalletBalances(nodesOnRiver),
            this.pinger.pingNodes(combinedNodes),
            this.getAllSpacesWithMemberships(numTotalSpaces),
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

        let numTotalSpaceMemberships = 0
        if (spacesWithMemberships.kind === 'success') {
            numTotalSpaceMemberships = spacesWithMemberships.result.reduce(
                (acc, space) => acc + space.memberships,
                0,
            )
        }

        return {
            walletBalances,
            nodePingResults,
            combinedNodes,
            combinedOperators,
            combinedNodesWithOperators,
            combinedOperatorsWithNodes,
            nodesOnBase,
            nodesOnRiver,
            spacesWithMemberships,
            aggregateNetworkStats: {
                numTotalSpaces,
                numTotalSpaceMemberships,
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
