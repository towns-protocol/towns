import { z } from 'zod'

const BoolStringSchema = z.string().regex(/^(true|false)$/)
const BoolFromStringSchema = BoolStringSchema.transform((str) => str === 'true')

const envVarsSchema = z.object({
    RIVER_RPC_URL: z.string().url(),
    ENV: z.string(),
    LOG_LEVEL: z.string().optional().default('info'),
    LOG_PRETTY: BoolFromStringSchema.optional().default('true'),
})

const getConfig = () => {
    const envVars = envVarsSchema.parse(process.env)
    return {
        riverRpcURL: envVars.RIVER_RPC_URL,
        env: envVars.ENV,
        log: {
            level: envVars.LOG_LEVEL,
            pretty: envVars.LOG_PRETTY,
        },
    }
}

export const config = getConfig()
