import { Keyable } from './keyable'
import { SimpleCache } from './simple-cache'
import { banningCacheOptions } from './utils'

export class BannedTokenIdsRequest implements Keyable {
    spaceId: string
    constructor(spaceId: string) {
        this.spaceId = spaceId
    }
    toKey(): string {
        return `bannedTokenIds:${this.spaceId}`
    }
}

export class BannedTokenIdsCache extends SimpleCache<BannedTokenIdsRequest, string[]> {
    constructor() {
        super({
            ...banningCacheOptions,
        })
    }
}
