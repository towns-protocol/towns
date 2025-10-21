import { Address } from 'viem'
import { Keyable } from './keyable'
import { SimpleCache } from './simple-cache'
import { banningCacheOptions } from './utils'

export class OwnerOfTokenRequest implements Keyable {
    spaceId: string
    tokenId: string
    constructor(spaceId: string, tokenId: string) {
        this.spaceId = spaceId
        this.tokenId = tokenId
    }
    toKey(): string {
        return `ownerOfToken:${this.spaceId}:${this.tokenId}`
    }
}
export class OwnerOfTokenCache extends SimpleCache<OwnerOfTokenRequest, Address> {
    constructor() {
        super(banningCacheOptions)
    }
}
