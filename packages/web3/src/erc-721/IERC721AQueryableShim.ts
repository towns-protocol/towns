import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { IERC721AQueryable__factory } from '@towns-protocol/generated/dev/typings/factories/IERC721AQueryable__factory'
import { ContractType } from '../types/typechain'

export class IERC721AQueryableShim extends BaseContractShim<
    ContractType<typeof IERC721AQueryable__factory.connect>
> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(
            address,
            provider,
            IERC721AQueryable__factory.connect.bind(IERC721AQueryable__factory),
        )
    }
}
