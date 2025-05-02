import { IStreamRegistry__factory } from '@towns-protocol/generated/dev/typings/factories/IStreamRegistry__factory'
import { ContractType } from '../types/typechain'
import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'

export class IStreamRegistryShim extends BaseContractShim<
    ContractType<typeof IStreamRegistry__factory.connect>
> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, IStreamRegistry__factory.connect.bind(IStreamRegistry__factory))
    }
}
