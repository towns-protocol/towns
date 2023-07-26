import * as z from 'zod'

const baseUrlSchema = z.union([z.string().url(), z.literal('/')])

// VITE expresses booleans in many different ways.
// first we capture all possible ways,
// we then coerce them to a boolean via the following function
const boolish = z.union([
    z.literal('1'),
    z.literal('0'),
    z.literal(''),
    z.literal(0),
    z.literal(1),
    z.literal('true'),
    z.literal('false'),
    z.boolean(),
])

const coerceBoolish = (value: z.TypeOf<typeof boolish>) => {
    return value === '1' || value === true || value === 'true' || value === 1
}

const envSchema = z.object({
    MODE: z.string(),
    DEV: boolish,
    PROD: boolish,
    BASE_URL: baseUrlSchema,
    VITE_TYPEFORM_ALPHA_URL: z.string().optional(),
    VITE_IGNORE_IS_DEV_CHECKS: z.string().optional(),
    VITE_TOKEN_SERVER_URL: z.string().url(),
    VITE_MATRIX_HOMESERVER_URL: z.string().url(),
    VITE_CHAIN_ID: z.string(),
    VITE_UNFURL_SERVER_URL: z.string().url(),
    VITE_GATEWAY_URL: z.string().url(),
    VITE_CASABLANCA_HOMESERVER_URL: z.string().optional(), // for now, we're allowing nullish values for casablanca URL
    VITE_PRIMARY_PROTOCOL: z.enum(['matrix', 'casablanca']).default('matrix'), // got test errors when trying to import SpaceProtocol from lib
    VITE_AUTH_WORKER_HEADER_SECRET: z.string(), // TODO: is it safe to have these as VITE_ env vars on the client?
    VITE_GIPHY_API_KEY: z.string(), // TODO: is it safe to have these as VITE_ env vars on the client?
    VITE_ALCHEMY_API_KEY: z.string(), // TODO: is it safe to have these as VITE_ env vars on the client?
    VITE_APP_RELEASE_VERSION: z.string().optional(),
    VITE_SENTRY_DSN: z.string().optional(),
    VITE_SENTRY_BEARER_TOKEN: z.string().optional(),
    VITE_AMPLITUDE_KEY: z.string().nullish(), // making this optional since we want to allow local development without it
    VITE_GLEAP_API_KEY: z.string().optional(), // making this optional since we want to allow local development without it

    VITE_PUSH_NOTIFICATION_ENABLED: boolish.transform(coerceBoolish).default(false), // making this optional since we want to allow local development with / without it
    VITE_DISABLE_SENTRY: boolish.transform(coerceBoolish).default(false), // making this optional since we want to allow local development with / without it

    VITE_WEB_PUSH_APPLICATION_SERVER_KEY: z.string().optional(), // making this optional since we want to allow local development without it
    VITE_WEB_PUSH_WORKER_URL: z.string().optional(), // url to the web push worker
    VITE_AMP_WORKER_URL: z.string().url().optional(),
    VITE_TOWNS_TOKEN_URL: z.string().url().optional(),
    VITE_WALLET_CONNECT_PROJECT_ID: z.string().default('stringtopreventerror'),
})

const parsed = envSchema.safeParse(import.meta.env)

if (!parsed.success) {
    console.error(parsed.error)
    throw new Error('Invalid environment variables')
}

const rawEnv = parsed.data

export const env = {
    ...rawEnv,
    IS_DEV: coerceBoolish(rawEnv.DEV),
}

// hacky workaround b/c framer motion throws weird errors when running tests
export function swapValueInTests<O, X>(orignalValue: O, testValue: X) {
    if (env.MODE === 'test') {
        return testValue
    }
    return orignalValue
}
