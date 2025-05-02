import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { ContractType } from '../types/typechain'
import { PrepayFacet__factory } from '@towns-protocol/generated/dev/typings/factories/PrepayFacet__factory'

export class IPrepayShim extends BaseContractShim<
    ContractType<typeof PrepayFacet__factory.connect>
> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, PrepayFacet__factory.connect.bind(PrepayFacet__factory))
    }
}
