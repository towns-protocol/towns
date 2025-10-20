import { isTestEnv } from '@towns-protocol/utils'
import { BannedTokenIdsCache } from './banned-token-id.cache'
import {
    EntitledWallet,
    EntitlementCache,
    EntitlementData,
    EntitlementRequest,
} from './entitlements.cache'
import { IsTokenBannedCache } from './is-banned-token.cache'
import { OwnerOfTokenCache } from './owner-of-token.cache'
import { LOCALHOST_CHAIN_ID } from '../../utils/Web3Constants'

export class CacheManager {
    public readonly bannedTokenIdsCache: BannedTokenIdsCache
    public readonly isTokenBannedCache: IsTokenBannedCache
    public readonly ownerOfTokenCache: OwnerOfTokenCache
    public readonly entitlementCache: EntitlementCache<EntitlementRequest, EntitlementData[]>
    public readonly entitledWalletCache: EntitlementCache<EntitlementRequest, EntitledWallet>
    public readonly entitlementEvaluationCache: EntitlementCache<EntitlementRequest, boolean>

    constructor(chainId?: number) {
        const isLocalDev = isTestEnv() || chainId === LOCALHOST_CHAIN_ID

        const entitlementCacheOpts = {
            positiveCacheTTLSeconds: isLocalDev ? 5 : 15 * 60,
            negativeCacheTTLSeconds: 2,
        }

        this.bannedTokenIdsCache = new BannedTokenIdsCache()
        this.isTokenBannedCache = new IsTokenBannedCache()
        this.ownerOfTokenCache = new OwnerOfTokenCache()
        // The caching of positive entitlements is shorter on both the node and client.
        this.entitlementCache = new EntitlementCache({
            positiveCacheTTLSeconds: isLocalDev ? 5 : 15,
            negativeCacheTTLSeconds: 2,
        })
        this.entitledWalletCache = new EntitlementCache(entitlementCacheOpts)
        this.entitlementEvaluationCache = new EntitlementCache(entitlementCacheOpts)
    }
}
