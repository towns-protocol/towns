import { isTestEnv } from '@towns-protocol/utils'

export const banningCacheOptions = {
    ttlSeconds: isTestEnv() ? 5 : 15 * 60,
}
