import { EntitlementsManager__factory } from '@towns-protocol/generated/dev/typings/factories/EntitlementsManager__factory'
import { ethers } from 'ethers'
import { IEntitlementsManagerBase } from '@towns-protocol/generated/dev/typings/IEntitlementsManager'
import { BaseContractShim } from '../BaseContractShim'
import { Keyable } from '../cache/Keyable'
import { SimpleCache } from '../cache/SimpleCache'
import { SpaceDappCreateStorageFn } from '../space-dapp/SpaceDapp'

const { abi, connect } = EntitlementsManager__factory

export type { IEntitlementsManagerBase as IEntitlementsBase }

export class IEntitlementsShim extends BaseContractShim<typeof connect> {
    private readonly getEntitlementsCache: SimpleCache<
        IEntitlementsManagerBase.EntitlementStructOutput[]
    >

    constructor(
        address: string,
        provider: ethers.providers.Provider,
        createStorageFn: SpaceDappCreateStorageFn | undefined,
    ) {
        super(address, provider, connect, abi)

        this.getEntitlementsCache = new SimpleCache({
            ttlSeconds: 15 * 60,
            createStorageFn,
        })
    }

    public async getEntitlements(): Promise<IEntitlementsManagerBase.EntitlementStructOutput[]> {
        return this.getEntitlementsCache.executeUsingCache(
            Keyable.getEntitlementsRequest(this.address),
            async () => this.read.getEntitlements(),
        )
    }
}
