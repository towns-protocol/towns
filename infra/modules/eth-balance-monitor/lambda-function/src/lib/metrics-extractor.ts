import {
    getWeb3Deployment,
    RiverRegistry,
    BaseRegistry,
    SpaceOwner,
    SpaceRegistrar,
    SpaceDapp,
    findDynamicPricingModule,
    findFixedPricingModule,
    PricingModuleStruct,
} from '@river-build/web3'
import { ethers } from 'ethers'
import { Ping as Pinger } from './pinger'
import { getWalletBalances } from './wallet-balance'
import { NodeStructOutput } from '@river-build/generated/dev/typings/INodeRegistry'
import { Unpromisify, withQueue } from './utils'
import { MetricsIntegrator } from './metrics-integrator'
import { IERC721ABase } from '@river-build/generated/dev/typings/IERC721AQueryable'

export type MetricsExtractorScrapeConfig = {
    getSpaceMemberships: boolean
}

export type MetricsExtractorConfig = {
    baseChainRpcUrl: string
    riverChainRpcUrl: string
    environment: string
}

export type RiverMetrics = Unpromisify<ReturnType<typeof MetricsExtractor.prototype.extract>>

export type SpaceWithTokenOwners = {
    address: string
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
        private readonly spaceOwner: SpaceOwner,
        private readonly spaceDapp: SpaceDapp,
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
        const spaceDapp = new SpaceDapp(deployment.base, baseChainProvider)
        const pinger = new Pinger()
        const metricsIntegrator = new MetricsIntegrator()
        const scrapeConfig = {
            getSpaceMemberships: config.environment === 'omega', // this is an incredibly expensive query, so we only do it for omega
        }

        return new MetricsExtractor(
            baseChainProvider,
            riverChainProvider,
            riverRegistry,
            baseRegistry,
            spaceOwner,
            spaceDapp,
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

    private async getSpaceOwners(numTotalSpaces: number) {
        const NUM_RETRIES = 3
        const THROTTLE_LIMIT = 200 // num requests
        const THROTTLE_INTERVAL = 1000 // per ms
        const CONCURRENCY = 50

        console.log('getting space owners')
        const getSpaceOwnerArgs = Array.from({ length: numTotalSpaces }, (_, i) => i)
        const onFailedAttempt = (tokenId: number, error: Error) => {
            console.warn(
                error,
                `failed attempt to get space owner for token id ${tokenId}. retrying...`,
            )
        }
        const options = {
            concurrency: CONCURRENCY,
            retries: NUM_RETRIES,
            throttle: {
                limit: THROTTLE_LIMIT,
                interval: THROTTLE_INTERVAL,
            },
            onFailedAttempt,
        }

        const spaceOwners = await withQueue(
            this.spaceOwner.erc721A.read.ownerOf,
            getSpaceOwnerArgs,
            options,
        )
        console.log('got space owners')
        return spaceOwners
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

    private async getSpaceWithMembershipsByTokenId({
        tokenId,
        fixedPricingModule,
        dynamicPricingModule,
        v1DynamicPricingModule,
    }: {
        tokenId: number
        fixedPricingModule: PricingModuleStruct
        dynamicPricingModule: PricingModuleStruct
        v1DynamicPricingModule: PricingModuleStruct | undefined
    }): Promise<SpaceWithTokenOwners> {
        const spaceAddress =
            await this.spaceDapp.spaceRegistrar.SpaceArchitect.read.getSpaceByTokenId(tokenId)
        const space = this.spaceDapp.spaceRegistrar.getSpace(spaceAddress)!
        const numMembershipsBigInt = await space.ERC721A.read.totalSupply()
        const numMemberships = numMembershipsBigInt.toNumber()
        const membershipTokenIds = Array.from({ length: numMemberships }, (_, i) => i)
        const tokenOwnerships = await space.ERC721AQueryable.read.explicitOwnershipsOf(
            membershipTokenIds,
        )
        const membershipPrice = await space.Membership.read.getMembershipPrice()
        const isPriced = membershipPrice.gt(0)
        let numPaidMemberships = 0

        const pricingModule = await space.Membership.read.getMembershipPricingModule()
        const currentPricingModuleName = pricingModule.toLowerCase()
        const isFixed =
            currentPricingModuleName === fixedPricingModule.module.toString().toLowerCase()
        const isV1Dynamic =
            v1DynamicPricingModule &&
            currentPricingModuleName === v1DynamicPricingModule.module.toString().toLowerCase()
        const isV2Dynamic =
            currentPricingModuleName === dynamicPricingModule.module.toString().toLowerCase()

        if (isPriced) {
            if (isFixed) {
                // is fixed pricing module

                numPaidMemberships = numMemberships
            } else if (isV1Dynamic || isV2Dynamic) {
                // is dynamic pricing module

                // TODO: should we include remaining pre-paid memberships in the count?

                const freeAllocationsBigNumber =
                    await space.Membership.read.getMembershipFreeAllocation()
                const freeAllocations = freeAllocationsBigNumber.toNumber()

                numPaidMemberships = Math.max(0, numMemberships - freeAllocations)
            } else {
                throw new Error(`Unknown pricing module: ${pricingModule}`)
            }
        }

        // remove the space owner from paid members:
        numPaidMemberships = Math.max(0, numPaidMemberships - 1)

        return {
            address: spaceAddress,
            numMemberships,
            tokenOwnerships,
            isPriced,
            numPaidMemberships,
            pricingModule: currentPricingModuleName,
        }
    }

    private getUniqueMembers(space: SpaceWithTokenOwners) {
        const uniqueMembers = new Set<string>()
        space.tokenOwnerships.forEach((ownership) => {
            if (!ownership.burned) {
                uniqueMembers.add(ownership.addr)
            }
        })
        return uniqueMembers
    }

    private getNumMembershipsPerMemberAddress(spaces: SpaceWithTokenOwners[]) {
        const memberToNumMemberships = new Map<string, number>()
        spaces.forEach((space) => {
            const uniqueMembers = this.getUniqueMembers(space)
            for (const member of uniqueMembers) {
                const currentNumMemberships = memberToNumMemberships.get(member) || 0
                memberToNumMemberships.set(member, currentNumMemberships + 1)
            }
        })
        return memberToNumMemberships
    }

    private async getAllSpacesWithMemberships(numTotalSpaces: number) {
        const NUM_RETRIES = 3
        const THROTTLE_LIMIT = 200 // num requests
        const THROTTLE_INTERVAL = 1000 // per ms
        const CONCURRENCY = 50

        if (!this.scrapeConfig.getSpaceMemberships) {
            return {
                kind: 'skipped' as const,
            }
        }
        console.log('getting space memberships')

        const pricingModules = await this.spaceDapp.listPricingModules()
        const fixedPricingModule = findFixedPricingModule(pricingModules)
        const dynamicPricingModule = findDynamicPricingModule(pricingModules)
        const v1DynamicPricingModule = pricingModules.find(
            (module) => module.name === 'TieredLogPricingOracle',
        )

        if (!fixedPricingModule || !dynamicPricingModule) {
            throw new Error('No pricing modules found')
        }

        const getSpaceArgs = Array.from({ length: numTotalSpaces }, (_, i) => ({
            tokenId: i,
            fixedPricingModule,
            dynamicPricingModule,
            v1DynamicPricingModule,
        }))
        const onFailedAttempt = ({ tokenId }: { tokenId: number }, error: Error) => {
            console.warn(
                error,
                `failed attempt to get space memberships for token id ${tokenId}. retrying...`,
            )
        }
        const options = {
            concurrency: CONCURRENCY,
            retries: NUM_RETRIES,
            throttle: {
                limit: THROTTLE_LIMIT,
                interval: THROTTLE_INTERVAL,
            },
            onFailedAttempt,
        }

        const spacesWithMemberships = await withQueue(
            this.getSpaceWithMembershipsByTokenId.bind(this),
            getSpaceArgs,
            options,
        )

        console.log('got space memberships')

        console.log('sorting space memberships')
        spacesWithMemberships.sort((a, b) => b.numMemberships - a.numMemberships) // sort by memberships in descending order
        console.log('sorted space memberships')

        return {
            kind: 'success' as const,
            result: spacesWithMemberships,
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
            spaceOwners,
        ] = await Promise.all([
            this.getBaseChainWalletBalances(nodesOnRiver),
            this.getRiverChainWalletBalances(nodesOnRiver),
            this.pinger.pingNodes(combinedNodes),
            this.getAllSpacesWithMemberships(numTotalSpaces),
            this.getSpaceOwners(numTotalSpaces),
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

        let numTotalSpaceMemberships = 0
        let memberAddressToNumMemberships: Map<string, number> = new Map()
        let numTotalUniqueSpaceMembers = 0
        if (spacesWithMemberships.kind === 'success') {
            numTotalSpaceMemberships = spacesWithMemberships.result.reduce(
                (acc, space) => acc + space.numMemberships,
                0,
            )

            memberAddressToNumMemberships = this.getNumMembershipsPerMemberAddress(
                spacesWithMemberships.result,
            )

            numTotalUniqueSpaceMembers = memberAddressToNumMemberships.size
        }

        const numTotalPricedSpaces =
            spacesWithMemberships.kind === 'success'
                ? spacesWithMemberships.result.filter((space) => space.isPriced).length
                : 0

        const numTotalPaidSpaceMemberships =
            spacesWithMemberships.kind === 'success'
                ? spacesWithMemberships.result.reduce(
                      (acc, space) => acc + space.numPaidMemberships,
                      0,
                  )
                : 0

        const numTotalSpacesWithPaidMemberships =
            spacesWithMemberships.kind === 'success'
                ? spacesWithMemberships.result.filter((space) => space.numPaidMemberships > 0)
                      .length
                : 0

        const numUniqueSpaceOwners = new Set(spaceOwners).size

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
            memberAddressToNumMemberships,
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
                numTotalUniqueSpaceMembers,
                numTotalPricedSpaces,
                numTotalPaidSpaceMemberships,
                numTotalSpacesWithPaidMemberships,
                numUniqueSpaceOwners,
            },
        }
    }
}
