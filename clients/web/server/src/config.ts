import { z } from 'zod'
import * as dotenv from 'dotenv'
import path from 'node:path'

dotenv.config({ path: path.join(__dirname, '../../app', '.env.local') })

const envSchema = z.object({
    MODE: z.string(),
    PORT: z.string().optional(),
    VITE_RIVER_ENV: z.string().optional(),
    VITE_BASE_SEPOLIA_RPC_URL: z.string().url().optional(),
    VITE_BASE_CHAIN_RPC_URL: z.string().url().optional(),
})

// eslint-disable-next-line no-process-env -- This is the only place we should access process.env
const env = envSchema.parse(process.env)

const PORT = Number(env.PORT) || 3000

// TODO: update this to cover all environments, including alpha and localhost
const PROVIDER_URL =
    env.MODE === 'gamma' ? env.VITE_BASE_SEPOLIA_RPC_URL : env.VITE_BASE_CHAIN_RPC_URL
if (!PROVIDER_URL) {
    throw new Error('Missing RPC URL')
}

export const config = {
    ...env,
    PORT,
    PROVIDER_URL,
}
