import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { OwnableFacet__factory } from '@towns-protocol/generated/dev/typings/factories/OwnableFacet__factory'
import { Keyable } from '../cache/Keyable'
import { SimpleCache } from '../cache/SimpleCache'
import { SpaceDappCreateStorageFn } from '../space-dapp/SpaceDapp'

const { abi, connect } = OwnableFacet__factory

export class OwnableFacetShim extends BaseContractShim<typeof connect> {
    private readonly ownerCache: SimpleCache<string>

    constructor(
        address: string,
        provider: ethers.providers.Provider,
        createStorageFn: SpaceDappCreateStorageFn | undefined,
    ) {
        super(address, provider, connect, abi)

        this.ownerCache = new SimpleCache({
            ttlSeconds: 120 * 60,
            createStorageFn,
        })
    }

    public async getOwner(): Promise<string> {
        return this.ownerCache.executeUsingCache(Keyable.owner(this.address), async () =>
            this.read.owner(),
        )
    }
}
