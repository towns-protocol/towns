import TTLCache from '@isaacs/ttlcache'
import { Keyable } from './keyable'
import { EntitlementModuleType, Permission, VersionedRuleData } from '../../types/ContractTypes'

export type EntitlementData = {
    entitlementType: EntitlementModuleType
    ruleEntitlement: VersionedRuleData | undefined
    userEntitlement: string[] | undefined
}

export interface CacheResult<V> {
    value: V
    cacheHit: boolean
    isPositive: boolean
}

export type EntitledWallet = string | undefined

export class EntitlementDataCacheResult implements CacheResult<EntitlementData[]> {
    value: EntitlementData[]
    cacheHit: boolean
    isPositive: boolean
    constructor(value: EntitlementData[]) {
        this.value = value
        this.cacheHit = false
        this.isPositive = true
    }
}

export class EntitledWalletCacheResult implements CacheResult<EntitledWallet> {
    value: EntitledWallet
    cacheHit: boolean
    isPositive: boolean
    constructor(value: EntitledWallet) {
        this.value = value
        this.cacheHit = false
        this.isPositive = value !== undefined
    }
}

export class BooleanCacheResult implements CacheResult<boolean> {
    value: boolean
    cacheHit: boolean
    isPositive: boolean
    constructor(value: boolean) {
        this.value = value
        this.cacheHit = false
        this.isPositive = value
    }
}

export class EntitlementRequest implements Keyable {
    spaceId: string
    channelId: string
    userId: string
    permission: Permission
    constructor(spaceId: string, channelId: string, userId: string, permission: Permission) {
        this.spaceId = spaceId
        this.channelId = channelId
        this.userId = userId
        this.permission = permission
    }
    toKey(): string {
        return `{spaceId:${this.spaceId},channelId:${this.channelId},userId:${this.userId},permission:${this.permission}}`
    }
}

export class EntitlementCache<K extends Keyable, V> {
    private readonly negativeCache: TTLCache<string, CacheResult<V>>
    private readonly positiveCache: TTLCache<string, CacheResult<V>>

    constructor(options?: {
        positiveCacheTTLSeconds: number
        negativeCacheTTLSeconds: number
        positiveCacheSize?: number
        negativeCacheSize?: number
    }) {
        const positiveCacheTTLSeconds = options?.positiveCacheTTLSeconds ?? 15 * 60
        const negativeCacheTTLSeconds = options?.negativeCacheTTLSeconds ?? 2
        const positiveCacheSize = options?.positiveCacheSize ?? 10000
        const negativeCacheSize = options?.negativeCacheSize ?? 10000

        this.negativeCache = new TTLCache({
            ttl: negativeCacheTTLSeconds * 1000,
            max: negativeCacheSize,
        })
        this.positiveCache = new TTLCache({
            ttl: positiveCacheTTLSeconds * 1000,
            max: positiveCacheSize,
        })
    }

    invalidate(keyable: K) {
        const key = keyable.toKey()
        this.negativeCache.delete(key)
        this.positiveCache.delete(key)
    }

    async executeUsingCache(
        keyable: K,
        onCacheMiss: (k: K) => Promise<CacheResult<V>>,
    ): Promise<CacheResult<V>> {
        const key = keyable.toKey()
        const negativeCacheResult = this.negativeCache.get(key)
        if (negativeCacheResult !== undefined) {
            negativeCacheResult.cacheHit = true
            return negativeCacheResult
        }

        const positiveCacheResult = this.positiveCache.get(key)
        if (positiveCacheResult !== undefined) {
            positiveCacheResult.cacheHit = true
            return positiveCacheResult
        }

        const result = await onCacheMiss(keyable)
        if (result.isPositive) {
            this.positiveCache.set(key, result)
        } else {
            this.negativeCache.set(key, result)
        }

        return result
    }
}

export function newSpaceEntitlementEvaluationRequest(
    spaceId: string,
    userId: string,
    permission: Permission,
): EntitlementRequest {
    return new EntitlementRequest(spaceId, '', userId, permission)
}

export function newChannelEntitlementEvaluationRequest(
    spaceId: string,
    channelId: string,
    userId: string,
    permission: Permission,
): EntitlementRequest {
    return new EntitlementRequest(spaceId, channelId, userId, permission)
}

export function newSpaceEntitlementRequest(
    spaceId: string,
    permission: Permission,
): EntitlementRequest {
    return new EntitlementRequest(spaceId, '', '', permission)
}

export function newChannelEntitlementRequest(
    spaceId: string,
    channelId: string,
    permission: Permission,
): EntitlementRequest {
    return new EntitlementRequest(spaceId, channelId, '', permission)
}
