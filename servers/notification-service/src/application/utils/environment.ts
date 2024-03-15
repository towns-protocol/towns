import { z } from 'zod'

const envSchema = z.object({
    NODE_ENV: z.string(),
    PORT: z.string().default('80'),
    NOTIFICATION_DATABASE_URL: z.string(),
    NOTIFICATION_SYNC_ENABLED: z.string().default('true'),
    AUTH_SECRET: z.string(),
    VAPID_PUBLIC_KEY: z.string(),
    VAPID_PRIVATE_KEY: z.string(),
    VAPID_SUBJECT: z.string(),
    RIVER_NODE_URL: z.string(),
    RIVER_DEBUG_TRANSPORT: z.string().optional(),
    NODE_TLS_REJECT_UNAUTHORIZED: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
    console.error(parsed.error)
    throw new Error('Invalid environment variables')
}

export const env = parsed.data
