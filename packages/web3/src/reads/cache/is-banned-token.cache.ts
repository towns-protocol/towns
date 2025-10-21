import { Keyable } from './keyable'
import { SimpleCache } from './simple-cache'
import { banningCacheOptions } from './utils'

export class IsTokenBanned implements Keyable {
    spaceId: string
    tokenId: string
    constructor(spaceId: string, tokenId: string) {
        this.spaceId = spaceId
        this.tokenId = tokenId
    }
    toKey(): string {
        return `isBanned:${this.spaceId}:${this.tokenId}`
    }
}

export class IsTokenBannedCache extends SimpleCache<IsTokenBanned, boolean> {
    constructor() {
        super(banningCacheOptions)
    }
}
