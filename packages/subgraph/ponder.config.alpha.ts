import { createConfig } from 'ponder'
import { makePonderConfig } from './utils/makePonderConfig'
import { http } from 'viem'

// Get the start block from environment variable or use default
const startBlock = process.env.PONDER_START_BLOCK
    ? parseInt(process.env.PONDER_START_BLOCK, 10)
    : 22890725

const config = makePonderConfig({
    environment: 'alpha',
    baseChain: {
        id: 84532,
        rpc: http(process.env.PONDER_RPC_URL_1),
        disableCache: false,
    },
    baseChainStartBlock: startBlock,
})

export default createConfig(config)
