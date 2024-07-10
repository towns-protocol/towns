import zod from 'zod'

export const envVarsSchema = zod.object({
    RIVER_RPC_URL: zod.string().url(),
    ENV: zod.string(),
})
