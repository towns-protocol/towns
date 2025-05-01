import { createConfig, mergeAbis, factory } from 'ponder'
import { http, parseAbiItem } from 'viem'

// import abis
import {
    createSpaceFacetAbi,
    spaceOwnerAbi,
    tokenPausableFacetAbi,
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

export default createConfig({
    networks: {
        anvil: {
            chainId: 31337,
            transport: http(process.env.PONDER_RPC_URL_1),
            disableCache: true,
        },
        gamma: {
            chainId: 84532,
            transport: http(process.env.PONDER_RPC_URL_1),
            disableCache: true,
        },
    },
    contracts: {
        Space: {
            abi: mergeAbis([createSpaceFacetAbi, tokenPausableFacetAbi]),
            address: spaceFactory,
            startBlock,
            network: 'anvil',
        },
        SpaceFactory: {
            abi: mergeAbis([createSpaceFacetAbi, tokenPausableFacetAbi]),
            address: factory({
                address: spaceFactory,
                event: parseAbiItem([
                    'event SpaceCreated(address indexed owner, uint256 indexed tokenId, address indexed space)',
                ]),
                parameter: 'space',
            }),
            startBlock,
            network: 'anvil',
        },
        SpaceOwner: {
            abi: spaceOwnerAbi,
            address: spaceOwner,
            startBlock,
            network: 'anvil',
        },
    },
})
