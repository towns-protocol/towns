import { EntitlementsManager__factory } from '@towns-protocol/generated/dev/typings/factories/EntitlementsManager__factory'
import { ethers } from 'ethers'
import { IEntitlementsManagerBase } from '@towns-protocol/generated/dev/typings/IEntitlementsManager'
import { BaseContractShim } from '../BaseContractShim'
import { Keyable } from '../cache/Keyable'
import { SimpleCache } from '../cache/SimpleCache'

const { abi, connect } = EntitlementsManager__factory

export type { IEntitlementsManagerBase as IEntitlementsBase }

export class GetEntitlements implements Keyable {
    spaceId: string
    constructor(spaceId: string) {
        this.spaceId = spaceId
    }
    toKey(): string {
        return `getEntitlements:${this.spaceId}`
    }
}

export class IEntitlementsShim extends BaseContractShim<typeof connect> {
    private readonly getEntitlementsCache: SimpleCache<
        GetEntitlements,
        IEntitlementsManagerBase.EntitlementStructOutput[]
    >

    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)

        this.getEntitlementsCache = new SimpleCache({
            ttlSeconds: 15 * 60,
        })
    }

    public async getEntitlements(
        spaceId: string,
    ): Promise<IEntitlementsManagerBase.EntitlementStructOutput[]> {
        return this.getEntitlementsCache.executeUsingCache(new GetEntitlements(spaceId), async () =>
            this.read.getEntitlements(),
        )
    }
}
