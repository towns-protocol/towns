import { IOperatorRegistry__factory } from '@towns-protocol/generated/dev/typings/factories/IOperatorRegistry__factory'
import { ContractType } from '../types/typechain'
import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'

export class IOperatorRegistryShim extends BaseContractShim<
    ContractType<typeof IOperatorRegistry__factory.connect>
> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(
            address,
            provider,
            IOperatorRegistry__factory.connect.bind(IOperatorRegistry__factory),
        )
    }
}
