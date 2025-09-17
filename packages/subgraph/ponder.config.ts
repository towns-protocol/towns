import { createConfig } from 'ponder'
import { http } from 'viem'
import { makePonderConfig } from './utils/makePonderConfig'

// Get the start block from environment variable or use default
const startBlock = process.env.PONDER_START_BLOCK
    ? parseInt(process.env.PONDER_START_BLOCK, 10)
    : 22890725

// running locally we can change the environment in the .env file
const environment = process.env.PONDER_ENVIRONMENT || 'local_dev'

export default createConfig(
    makePonderConfig({
        environment,
        baseChain: {
            id: 31337,
            rpc: http(process.env.PONDER_RPC_URL_1),
            disableCache: false,
        },
        baseChainStartBlock: startBlock,
    }),
)
