import { createConfig } from 'ponder'
import { http } from 'viem'

// import abis
import { createSpaceFacetAbi } from '@towns-protocol/contracts/typings'

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

export default createConfig({
    networks: {
        anvil: {
            chainId: 31337,
            transport: http(process.env.PONDER_RPC_URL_1),
            disableCache: true,
        },
    },
    contracts: {
        CreateSpace: {
            network: 'anvil',
            abi: createSpaceFacetAbi,
            address: spaceFactory,
            startBlock,
        },
    },
})
