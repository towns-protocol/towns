import * as z from 'zod'

const baseUrlSchema = z.union([z.string().url(), z.literal('/')])

// VITE expresses booleans in many different ways.
// first we capture all possible ways,
// we then coerce them to a boolean via the following function
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

// checks if a string represents a valid integer, and transforms it into an integer
const intString = z.string().transform((value) => {
    const parsed = parseInt(value, 10)
    if (isNaN(parsed)) {
        throw new Error('Value cannot be parsed into an integer')
    }
    return parsed
})

// checks if a string represents an integer between min and max, and transforms it into an integer
const intStringWithin = (min: number, max: number) => {
    return intString.refine((value) => value >= min && value <= max, {
        message: `Value must be between ${min} and ${max}`,
    })
}

const envSchema = z.object({
    MODE: z.string(),
    DEV: boolish,
    BASE_URL: baseUrlSchema,
    DESTROY_PROD_SERVICE_WORKER: boolish.default(false),

    VITE_APP_NAME: z.string().optional().default('Towns'),

    // start environment config, if any are set, all should be set
    VITE_BASE_CHAIN_RPC_URL: z.string().url().optional(),
    VITE_BASE_CHAIN_WS_URL: z.string().url().optional(),
    VITE_RIVER_CHAIN_RPC_URL: z.string().optional(),

    // start env specific config
    VITE_BASE_SEPOLIA_RPC_URL: z.string().url().optional(),
    VITE_BASE_SEPOLIA_WS_URL: z.string().url().optional(),
    VITE_RIVER_TESTNET_RPC_URL: z.string().url().optional(),
    // end env specific config
    VITE_RIVER_ENV: z.string().optional(),

    VITE_ETHEREUM_RPC_URL: z.string(),

    VITE_TOKEN_SERVER_URL: z.string().url(),
    VITE_UNFURL_SERVER_URL: z.string().url(),
    VITE_GATEWAY_URL: z.string().url(),
    VITE_RIVER_STREAM_METADATA_URL: z.string().url(),
    VITE_AUTH_WORKER_HEADER_SECRET: z.string(), // TODO: is it safe to have these as VITE_ env vars on the client?
    VITE_GIPHY_API_KEY: z.string(), // TODO: is it safe to have these as VITE_ env vars on the client?

    VITE_APP_RELEASE_VERSION: z.string().optional(),

    VITE_PUSH_NOTIFICATION_ENABLED: boolish.default(false), // making this optional since we want to allow local development with / without it
    VITE_DISABLE_DEBUG_BARS: boolish.default(false),

    VITE_WEB_PUSH_APPLICATION_SERVER_KEY: z.string().optional(), // making this optional since we want to allow local development without it
    VITE_WEB_PUSH_WORKER_URL: z.string().optional(), // url to the web push worker

    VITE_DD_CLIENT_TOKEN: z.string().optional(), // used for datadog client side monitoring
    VITE_PRIVY_ID: z.string(),
    VITE_PRIVY_CLIENT_ID: z.string().optional(),

    VITE_LOG_SAMPLING_RATE: intStringWithin(0, 100).optional(),
    VITE_AA_BUNDLER_URL: z.string().url(),
    VITE_AA_PAYMASTER_PROXY_URL: z.string().url(),
    VITE_AA_ENTRY_POINT_ADDRESS: z.string().optional(),
    VITE_AA_FACTORY_ADDRESS: z.string().optional(),

    VITE_ADDRESS_FOR_MAINNET_TOKENS_DEV: z.string().optional(),
    // Analytics keys
    VITE_RUDDERSTACK_API_CONFIG_URL: z.string().url().optional(),
    VITE_RUDDERSTACK_CDN_SDK_URL: z.string().url().optional(),
    VITE_RUDDERSTACK_PLUGINS_SDK_URL: z.string().url().optional(),
    VITE_RUDDERSTACK_DATA_PLANE_URL: z.string().url().optional(),
    VITE_RUDDERSTACK_WRITE_KEY: z.string().optional(),

    VITE_XCHAIN_CONFIG: z.string().optional(),
})

const parsed = envSchema.safeParse(import.meta.env)

if (!parsed.success) {
    console.error(parsed.error)

    if (import.meta.env.DEV && parsed.error.issues?.length) {
        console.error(
            'Issues parsing env:',
            parsed.error.issues.map((issue) => `${issue.path.join()} (${issue.message})`),
        )
    }

    throw new Error('Invalid environment variables')
}

const rawEnv = parsed.data

// if (import.meta.env.PROD) {
//     if (import.meta.env.MODE === 'production') {
//         throw new Error('"production" is not a valid mode. Set a mode via the `MODE` env var.')
//         // 'production' is the default mode name (the NODE_ENV of vite).
//         // we want to make sure this value is intentionally set, so we throw if we
//         // see the default value. in our case, our environments are named "test-alpha",
//         // "gamma", "alpha", "beta".
//     }
// }

export function isTest() {
    return Boolean(process.env.JEST_WORKER_ID)
}

export const env = {
    ...rawEnv,
}

console.log('MODE', env.MODE)
