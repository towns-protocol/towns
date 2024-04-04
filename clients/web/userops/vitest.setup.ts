import { beforeAll } from 'vitest'

beforeAll(async () => {
    if (!process.env.VITE_AA_RPC_URL) {
        throw new Error('VITE_AA_RPC_URL must be defined')
    }
    // assign the RPC_URL used in spacedapp mock web 3 provider
    process.env.RPC_URL = process.env.VITE_AA_RPC_URL
    // assign the towns env
    process.env.RIVER_ENV = process.env.VITE_RIVER_ENV ?? 'testnet'
})
