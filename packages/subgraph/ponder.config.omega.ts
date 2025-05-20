import { createConfig, mergeAbis, factory } from 'ponder'
import { http, parseAbiItem } from 'viem'

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
} from '@towns-protocol/contracts/typings'

// Import our contract address utility
import { getContractAddress } from './utils/contractAddresses'

// Get the start block from environment variable or use default
const startBlock = process.env.PONDER_START_BLOCK
    ? parseInt(process.env.PONDER_START_BLOCK, 10)
    : 22890725

// Get the space factory address using our utility
// Enable debug mode to see detailed path information
const spaceFactory = getContractAddress('spaceFactory')
if (!spaceFactory) {
    throw new Error('Space factory address not found')
}

const spaceOwner = getContractAddress('spaceOwner')
if (!spaceOwner) {
    throw new Error('Space owner address not found')
}

const swapRouter = getContractAddress('swapRouter')
if (!swapRouter) {
    throw new Error('Swap router address not found')
}

const baseRegistry = getContractAddress('baseRegistry')
if (!baseRegistry) {
    throw new Error('Base registry address not found')
}

export default createConfig({
    networks: {
        anvil: {
            chainId: 31337,
            transport: http(process.env.PONDER_RPC_URL_1),
            disableCache: true,
        },
        omega: {
            chainId: 8453,
            transport: http(process.env.PONDER_RPC_URL_1),
            disableCache: true,
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
            startBlock,
            network: 'omega',
        },
        SpaceFactory: {
            abi: mergeAbis([createSpaceFacetAbi, tokenPausableFacetAbi, swapFacetAbi]),
            address: spaceFactory,
            startBlock,
            network: 'omega',
        },
        Space: {
            abi: mergeAbis([createSpaceFacetAbi, tokenPausableFacetAbi, swapFacetAbi]),
            address: factory({
                address: spaceFactory,
                event: parseAbiItem([
                    'event SpaceCreated(address indexed owner, uint256 indexed tokenId, address indexed space)',
                ]),
                parameter: 'space',
            }),
            startBlock,
            network: 'omega',
        },
        SpaceOwner: {
            abi: spaceOwnerAbi,
            address: spaceOwner,
            startBlock,
            network: 'omega',
        },
        SwapRouter: {
            abi: swapRouterAbi,
            address: swapRouter,
            startBlock,
            network: 'omega',
        },
    },
})
