import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { IDropFacet__factory } from '@towns-protocol/generated/dev/typings/factories/IDropFacet__factory'
import { ContractType } from '../types/typechain'

export class IDropFacetShim extends BaseContractShim<
    ContractType<typeof IDropFacet__factory.connect>
> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, IDropFacet__factory.connect.bind(IDropFacet__factory))
    }
}
