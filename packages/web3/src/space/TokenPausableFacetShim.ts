import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { TokenPausableFacet__factory } from '@towns-protocol/generated/dev/typings/factories/TokenPausableFacet__factory'
import { ContractType } from '../types/typechain'

export class TokenPausableFacetShim extends BaseContractShim<
    ContractType<typeof TokenPausableFacet__factory.connect>
> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(
            address,
            provider,
            TokenPausableFacet__factory.connect.bind(TokenPausableFacet__factory),
        )
    }
}
