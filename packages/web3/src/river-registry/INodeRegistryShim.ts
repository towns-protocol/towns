import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { INodeRegistry__factory } from '@towns-protocol/generated/dev/typings/factories/INodeRegistry__factory'
import { ContractType } from '../types/typechain'

export class INodeRegistryShim extends BaseContractShim<
    ContractType<typeof INodeRegistry__factory.connect>
> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, INodeRegistry__factory.connect.bind(INodeRegistry__factory))
    }
}
