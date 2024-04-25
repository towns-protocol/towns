import { beforeAll } from 'vitest'

beforeAll(async () => {
    if (!process.env.AA_RPC_URL) {
        throw new Error('AA_RPC_URL must be defined')
    }
    // assign the RPC_URL used in spacedapp mock web 3 provider
    process.env.RPC_URL = process.env.AA_RPC_URL
    // assign the towns env
    process.env.RIVER_ENV = process.env.RIVER_ENV ?? 'gamma'
})
