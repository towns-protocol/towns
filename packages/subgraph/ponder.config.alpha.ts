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
        alpha: {
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
            chain: 'alpha',
        },
        RiverAirdrop: {
            abi: mergeAbis([rewardsDistributionV2Abi]),
            address: riverAirdrop,
            startBlock,
            chain: 'alpha',
        },
        SpaceFactory: {
            abi: mergeAbis([createSpaceFacetAbi, tokenPausableFacetAbi]),
            address: spaceFactory,
            startBlock,
            chain: 'alpha',
        },
        Space: {
            abi: mergeAbis([createSpaceFacetAbi, tokenPausableFacetAbi]),
            address: factory({
                address: spaceFactory,
                event: parseAbiItem([
                    'event SpaceCreated(address indexed owner, uint256 indexed tokenId, address indexed space)',
                ]),
                parameter: 'space',
            }),
            startBlock,
            chain: 'alpha',
        },
        SpaceOwner: {
            abi: spaceOwnerAbi,
            address: spaceOwner,
            startBlock,
            chain: 'alpha',
        },
    },
})
