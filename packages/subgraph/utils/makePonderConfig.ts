import { mergeAbis, factory, createConfig } from 'ponder'
import { parseAbiItem, Transport } from 'viem'

// import abis
import {
    createSpaceFacetAbi,
    spaceOwnerAbi,
    tokenPausableFacetAbi,
    mainnetDelegationAbi,
    entitlementCheckerAbi,
    nodeOperatorFacetAbi,
    spaceDelegationFacetAbi,
    rewardsDistributionV2Abi,
    xChainAbi,
    swapFacetAbi,
    swapRouterAbi,
    tippingFacetAbi,
    membershipFacetAbi,
    reviewFacetAbi,
    iAppRegistryAbi,
    iAppFactoryAbi,
    iIdentityRegistryAbi,
    iReputationRegistryAbi,
    subscriptionModuleFacetAbi,
} from '@towns-protocol/contracts/typings'

import { getContractAddress } from './contractAddresses'

export function makePonderConfig(
    params: {
        environment: string
        baseChain: {
            id: number
            rpc: Transport
            disableCache?: boolean
            pollingInterval?: number
            ws?: string
        }
        baseChainStartBlock: number
    },
    baseChainName: 'base' = 'base', // this is just a hack, if we hard code it below the compiler doesn't like it
) {
    const { environment, baseChain, baseChainStartBlock } = params
    // Get the space factory address using our utility
    // Enable debug mode to see detailed path information
    const spaceFactory = getContractAddress('spaceFactory', baseChainName, environment)
    if (!spaceFactory) {
        throw new Error('Space factory address not found')
    }

    const spaceOwner = getContractAddress('spaceOwner', baseChainName, environment)
    if (!spaceOwner) {
        throw new Error('Space owner address not found')
    }

    const swapRouter = getContractAddress('swapRouter', baseChainName, environment)
    if (!swapRouter) {
        throw new Error('Swap router address not found')
    }

    const baseRegistry = getContractAddress('baseRegistry', baseChainName, environment)
    if (!baseRegistry) {
        throw new Error('Base registry address not found')
    }

    const riverAirdrop = getContractAddress('riverAirdrop', baseChainName, environment)
    if (!riverAirdrop) {
        throw new Error('River airdrop address not found')
    }

    const appRegistry = getContractAddress('appRegistry', baseChainName, environment)
    if (!appRegistry) {
        throw new Error('App registry address not found')
    }

    // SubscriptionModule is optional - not deployed in all environments
    const subscriptionModule =
        getContractAddress('subscriptionModule', baseChainName, environment, {
            throwOnError: false,
        }) || '0x0000000000000000000000000000000000000001' // Dummy address for missing deployments

    if (
        !subscriptionModule ||
        subscriptionModule === '0x0000000000000000000000000000000000000001'
    ) {
        console.warn(
            `⚠️  SubscriptionModule not deployed for ${environment} on '${baseChainName}', using dummy address`,
        )
    }

    return {
        chains: {
            [baseChainName]: {
                id: baseChain.id,
                rpc: baseChain.rpc,
                disableCache: baseChain.disableCache,
                pollingInterval: baseChain.pollingInterval,
                ws: baseChain.ws,
            },
        },
        contracts: {
            BaseRegistry: {
                abi: mergeAbis([
                    mainnetDelegationAbi,
                    entitlementCheckerAbi,
                    nodeOperatorFacetAbi,
                    spaceDelegationFacetAbi,
                    rewardsDistributionV2Abi,
                    xChainAbi,
                ]),
                address: baseRegistry,
                startBlock: baseChainStartBlock,
                chain: baseChainName,
            },
            SpaceFactory: {
                abi: mergeAbis([createSpaceFacetAbi, tokenPausableFacetAbi, swapFacetAbi]),
                address: spaceFactory,
                startBlock: baseChainStartBlock,
                chain: baseChainName,
            },
            Space: {
                abi: mergeAbis([
                    createSpaceFacetAbi,
                    tokenPausableFacetAbi,
                    swapFacetAbi,
                    tippingFacetAbi,
                    membershipFacetAbi,
                    reviewFacetAbi,
                ]),
                address: factory({
                    address: spaceFactory,
                    event: parseAbiItem([
                        'event SpaceCreated(address indexed owner, uint256 indexed tokenId, address indexed space)',
                    ]),
                    parameter: 'space',
                }),
                startBlock: baseChainStartBlock,
                chain: baseChainName,
            },
            SpaceOwner: {
                abi: spaceOwnerAbi,
                address: spaceOwner,
                startBlock: baseChainStartBlock,
                chain: baseChainName,
            },
            SubscriptionModule: {
                abi: subscriptionModuleFacetAbi,
                address: subscriptionModule,
                // this can be set to much later than the start block, let's figure this out for all newer contracts like swap etc
                startBlock: baseChainStartBlock,
                chain: baseChainName,
            },
            SwapRouter: {
                abi: swapRouterAbi,
                address: swapRouter,
                startBlock: baseChainStartBlock,
                chain: baseChainName,
            },
            RiverAirdrop: {
                abi: mergeAbis([rewardsDistributionV2Abi]),
                address: riverAirdrop,
                startBlock: baseChainStartBlock,
                chain: baseChainName,
            },
            AppRegistry: {
                abi: mergeAbis([
                    iAppRegistryAbi,
                    iAppFactoryAbi,
                    iIdentityRegistryAbi,
                    iReputationRegistryAbi,
                ]),
                address: appRegistry,
                startBlock: baseChainStartBlock,
                chain: baseChainName,
            },
        },
    } satisfies Parameters<typeof createConfig>[0]
}
