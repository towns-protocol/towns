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
    z.boolean(),
])

const coerceBoolish = (value: z.TypeOf<typeof boolish>) => {
    return value === '1' || value === true || value === 1
}

const envSchema = z.object({
    MODE: z.string(),
    DEV: boolish,
    PROD: boolish,
    BASE_URL: baseUrlSchema,
    VITE_IGNORE_IS_DEV_CHECKS: z.string().optional(),
    VITE_TOKEN_SERVER_URL: z.string().url(),
    VITE_MATRIX_HOMESERVER_URL: z.string().url(),
    VITE_UNFURL_SERVER_URL: z.string().url(),
    VITE_CASABLANCA_SERVER_URL: z.string().url().nullish(), // for now, we're allowing nullish values for casablanca URL
    VITE_AUTH_WORKER_HEADER_SECRET: z.string(), // TODO: is it safe to have these as VITE_ env vars on the client?
    VITE_GIPHY_API_KEY: z.string(), // TODO: is it safe to have these as VITE_ env vars on the client?
    VITE_ALCHEMY_API_KEY: z.string(), // TODO: is it safe to have these as VITE_ env vars on the client?
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

// TODO: we probably want to move to .env at some point, and maybe we need a STAGE_CHAIN_ID at some point
export const PROD_CHAIN_ID = 5
