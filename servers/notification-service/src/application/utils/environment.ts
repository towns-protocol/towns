import { z } from 'zod'

const envSchema = z.object({
    NODE_ENV: z.string(),
    PORT: z.string().default('80'),
    NOTIFICATION_DATABASE_URL: z.string(),
    AUTH_SECRET: z.string(),
    VAPID_PUBLIC_KEY: z.string(),
    VAPID_PRIVATE_KEY: z.string(),
    VAPID_SUBJECT: z.string(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
    console.error(parsed.error)
    throw new Error('Invalid environment variables')
}

export const env = parsed.data
