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

const baseRegistry = getContractAddress('baseRegistry')
if (!baseRegistry) {
    throw new Error('Base registry address not found')
}

const swapRouter = getContractAddress('swapRouter')
if (!swapRouter) {
    throw new Error('Swap router address not found')
}

const riverAirdrop = getContractAddress('riverAirdrop')
if (!riverAirdrop) {
    throw new Error('River airdrop address not found')
}

export default createConfig({
    chains: {
        anvil: {
            id: 31337,
            rpc: http(process.env.PONDER_RPC_URL_1),
            disableCache: false,
        },
        gamma: {
            id: 84532,
            rpc: http(process.env.PONDER_RPC_URL_1),
            disableCache: false,
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
            chain: 'gamma',
        },
        SpaceFactory: {
            abi: mergeAbis([createSpaceFacetAbi, tokenPausableFacetAbi, swapFacetAbi]),
            address: spaceFactory,
            startBlock,
            chain: 'gamma',
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
            chain: 'gamma',
        },
        SpaceOwner: {
            abi: spaceOwnerAbi,
            address: spaceOwner,
            startBlock,
            chain: 'gamma',
        },
        SwapRouter: {
            abi: swapRouterAbi,
            address: swapRouter,
            startBlock,
            chain: 'gamma',
        },
        RiverAirdrop: {
            abi: mergeAbis([rewardsDistributionV2Abi]),
            address: riverAirdrop,
            startBlock,
            chain: 'gamma',
        },
    },
})
