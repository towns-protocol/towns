import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { OwnableFacet__factory } from '@towns-protocol/generated/dev/typings/factories/OwnableFacet__factory'
import { Keyable } from '../cache/Keyable'
import { SimpleCache } from '../cache/SimpleCache'

const { abi, connect } = OwnableFacet__factory

export class OwnableFacetShim extends BaseContractShim<typeof connect> {
    private readonly ownerCache: SimpleCache<string>

    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)

        this.ownerCache = new SimpleCache({
            ttlSeconds: 120 * 60,
        })
    }

    public async getOwner(): Promise<string> {
        return this.ownerCache.executeUsingCache(Keyable.ownerRequest(this.address), async () =>
            this.read.owner(),
        )
    }
}
