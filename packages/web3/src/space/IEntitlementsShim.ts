import { EntitlementsManager__factory } from '@towns-protocol/generated/dev/typings/factories/EntitlementsManager__factory'
import { ethers } from 'ethers'
import { IEntitlementsManagerBase } from '@towns-protocol/generated/dev/typings/IEntitlementsManager'
import { BaseContractShim } from '../BaseContractShim'
import { Keyable } from '../cache/Keyable'
import { SimpleCache } from '../cache/SimpleCache'

const { abi, connect } = EntitlementsManager__factory

export type { IEntitlementsManagerBase as IEntitlementsBase }

export class GetEntitlements implements Keyable {
    spaceAddress: string
    constructor(spaceAddress: string) {
        this.spaceAddress = spaceAddress
    }
    toKey(): string {
        return `getEntitlements:${this.spaceAddress}`
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

    public async getEntitlements(): Promise<IEntitlementsManagerBase.EntitlementStructOutput[]> {
        return this.getEntitlementsCache.executeUsingCache(
            new GetEntitlements(this.address),
            async () => this.read.getEntitlements(),
        )
    }
}
