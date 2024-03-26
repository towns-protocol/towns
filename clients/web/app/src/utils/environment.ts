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
    VITE_CF_TUNNEL_PREFIX: z.string().optional(),
    VITE_TYPEFORM_ALPHA_URL: z.string().optional(),
    VITE_IGNORE_IS_DEV_CHECKS: z.string().optional(),
    VITE_TOKEN_SERVER_URL: z.string().url(),
    VITE_CHAIN_ID: z.string(),
    VITE_UNFURL_SERVER_URL: z.string().url(),
    VITE_GATEWAY_URL: z.string().url(),
    VITE_CASABLANCA_HOMESERVER_DEV_PROXY_PATH: z.string().optional(), // for now, we're allowing nullish values for casablanca URL
    VITE_CASABLANCA_HOMESERVER_URL: z.string().optional(), // for now, we're allowing nullish values for casablanca URL
    VITE_AUTH_WORKER_HEADER_SECRET: z.string(), // TODO: is it safe to have these as VITE_ env vars on the client?
    VITE_GIPHY_API_KEY: z.string(), // TODO: is it safe to have these as VITE_ env vars on the client?
    VITE_PROVIDER_WS_URL: z.string().url().optional(),
    VITE_PROVIDER_HTTP_URL: z.string().url(),
    VITE_RIVER_CHAIN_PROVIDER_HTTP_URL: z.string().url(),
    VITE_RIVER_CHAIN_ID: z.string(),
    VITE_APP_RELEASE_VERSION: z.string().optional(),
    VITE_AMPLITUDE_KEY: z.string().nullish(), // making this optional since we want to allow local development without it
    VITE_GLEAP_API_KEY: z.string().optional(), // making this optional since we want to allow local development without it

    VITE_PUSH_NOTIFICATION_ENABLED: boolish.default(false), // making this optional since we want to allow local development with / without it
    VITE_DISABLE_DEBUG_BARS: boolish.default(false),

    VITE_WEB_PUSH_APPLICATION_SERVER_KEY: z.string().optional(), // making this optional since we want to allow local development without it
    VITE_WEB_PUSH_WORKER_URL: z.string().optional(), // url to the web push worker
    VITE_AMP_WORKER_URL: z.string().url().optional(),
    VITE_TOWNS_TOKEN_URL: z.string().url().optional(),

    VITE_TRANSIENT_ENV_GITHUB_PR_NUMBER: intString.optional(),

    VITE_DD_CLIENT_TOKEN: z.string().optional(), // used for datadog client side monitoring
    VITE_PRIVY_ID: z.string(),

    VITE_LOG_SAMPLING_RATE: intStringWithin(0, 100).optional(),
    VITE_LOG_FORWARDING: z
        .union([
            z.literal('all'),
            z.array(
                z.union([
                    z.literal('log'),
                    z.literal('debug'),
                    z.literal('info'),
                    z.literal('warn'),
                    z.literal('error'),
                ]),
            ),
        ])
        .optional(),

    VITE_AA_BUNDLER_URL: z.string().url(),
    VITE_AA_PAYMASTER_PROXY_URL: z.string().url(),
    VITE_AA_ENTRY_POINT_ADDRESS: z.string().optional(),
    VITE_AA_FACTORY_ADDRESS: z.string().optional(),

    VITE_ADDRESS_FOR_MAINNET_TOKENS_DEV: z.string().optional(),
    VITE_ENABLE_SLATE_PREVIEW: boolish.default(true),
})

const parsed = envSchema.safeParse(import.meta.env)

if (!parsed.success) {
    console.error(parsed.error)
    throw new Error('Invalid environment variables')
}

const rawEnv = parsed.data

let tunnelOverrides: {
    VITE_WEB_PUSH_WORKER_URL?: string
} = {}
if (rawEnv.VITE_CF_TUNNEL_PREFIX) {
    tunnelOverrides = {
        VITE_WEB_PUSH_WORKER_URL: `https://${rawEnv.VITE_CF_TUNNEL_PREFIX}-pnw.towns.com`,
    }
}

let devProxOverrides: {
    VITE_CASABLANCA_HOMESERVER_URL?: string
    VITE_CASABLANCA_HOMESERVER_PROXY_TARGET_URL?: string
} = {}

if (rawEnv.VITE_CASABLANCA_HOMESERVER_DEV_PROXY_PATH) {
    devProxOverrides = {
        VITE_CASABLANCA_HOMESERVER_URL: `/${rawEnv.VITE_CASABLANCA_HOMESERVER_DEV_PROXY_PATH}`,
        VITE_CASABLANCA_HOMESERVER_PROXY_TARGET_URL: rawEnv.VITE_CASABLANCA_HOMESERVER_URL,
    }
}

// if (import.meta.env.PROD) {
//     if (import.meta.env.MODE === 'production') {
//         throw new Error('"production" is not a valid mode. Set a mode via the `MODE` env var.')
//         // 'production' is the default mode name (the NODE_ENV of vite).
//         // we want to make sure this value is intentionally set, so we throw if we
//         // see the default value. in our case, our environments are named "test-alpha",
//         // "gamma", "alpha", "beta".
//     }
// }

export const env = {
    ...rawEnv,
    ...devProxOverrides,
    ...tunnelOverrides,
}

console.log('MODE', env.MODE)
