import { z } from 'zod'
import * as dotenv from 'dotenv'
import path from 'node:path'

dotenv.config({ path: path.join(__dirname, '../../app', '.env.local') })

const boolish = z
    .union([
        z.literal('1'),
        z.literal('0'),
        z.literal(''),
        z.literal(0),
        z.literal(1),
        z.literal('true'),
        z.literal('false'),
        z.boolean(),
    ])
    .transform((value) => {
        return value === '1' || value === true || value === 'true' || value === 1
    })

const envSchema = z.object({
    MODE: z.string(),
    PORT: z.string().optional(),
    VITE_RIVER_ENV: z.string().optional(),
    VITE_BASE_SEPOLIA_RPC_URL: z.string().url().optional(),
    VITE_BASE_CHAIN_RPC_URL: z.string().url().optional(),
    TRACING_ENABLED: boolish.optional().default(false),
    IS_PULL_REQUEST: boolish.optional().default(false),
    FORCE_ENABLE_TRACING: boolish.optional().default(false),
    VITE_GITHUB_PR_NUMBER: z.string().optional(),
    PROFILING_ENABLED: boolish.optional().default(false),
    DD_AGENT_HOST: z.string().optional(),
})

// eslint-disable-next-line no-process-env -- This is the only place we should access process.env
const env = envSchema.parse(process.env)

const PORT = Number(env.PORT) || 3000

// TODO: update this to cover all environments, including alpha and localhost
const PROVIDER_URL =
    env.MODE === 'gamma' || env.MODE === 'alpha'
        ? env.VITE_BASE_SEPOLIA_RPC_URL
        : env.VITE_BASE_CHAIN_RPC_URL
if (!PROVIDER_URL) {
    throw new Error('Missing RPC URL')
}

export const config = {
    ...env,
    PORT,
    PROVIDER_URL,
}
