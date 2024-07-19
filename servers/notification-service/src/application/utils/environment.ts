import { z } from 'zod'

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
    NODE_ENV: z.string(),
    RIVER_ENV: z.union([
        z.literal('test'),
        z.literal('development'),
        z.literal('omega'),
        z.literal('gamma'),
        z.literal('alpha'),
    ]),
    PORT: z.string().default('80'),
    NOTIFICATION_DATABASE_URL: z.string(),
    NOTIFICATION_SYNC_ENABLED: boolish.optional().default(true),
    AUTH_SECRET: z.string(),
    VAPID_PUBLIC_KEY: z.string(),
    VAPID_PRIVATE_KEY: z.string(),
    VAPID_SUBJECT: z.string(),
    RIVER_NODE_URL: z.string(),
    RIVER_DEBUG_TRANSPORT: boolish.optional(),
    NODE_TLS_REJECT_UNAUTHORIZED: z.string().optional(),
    APNS_AUTH_KEY: z.string(),
    APNS_KEY_ID: z.string(),
    APNS_TEAM_ID: z.string(),
    APNS_TOWNS_APP_IDENTIFIER: z.string(),
    LOG_LEVEL: z
        .union([
            z.literal('error'),
            z.literal('warn'),
            z.literal('info'),
            z.literal('debug'),
            z.literal('trace'),
        ])
        .optional()
        .default('info'),
})

export const env = envSchema.parse(process.env)

export const isProduction = env.NODE_ENV === 'production'
