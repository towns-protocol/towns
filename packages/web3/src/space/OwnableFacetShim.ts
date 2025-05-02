import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { ContractType } from '../types/typechain'
import { OwnableFacet__factory } from '@towns-protocol/generated/dev/typings/factories/OwnableFacet__factory'

export class OwnableFacetShim extends BaseContractShim<
    ContractType<typeof OwnableFacet__factory.connect>
> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, OwnableFacet__factory.connect.bind(OwnableFacet__factory))
    }
}
