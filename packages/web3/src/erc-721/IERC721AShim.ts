import { ethers } from 'ethers'
import { IERC721A__factory } from '@towns-protocol/generated/dev/typings/factories/IERC721A__factory'
import { ContractType } from '../types/typechain'
import { BaseContractShim } from '../BaseContractShim'

export class IERC721AShim extends BaseContractShim<ContractType<typeof IERC721A__factory.connect>> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, IERC721A__factory.connect.bind(IERC721A__factory))
    }
}
