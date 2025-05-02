import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { INodeOperator__factory } from '@towns-protocol/generated/dev/typings/factories/INodeOperator__factory'
import { ContractType } from '../types/typechain'

export class INodeOperatorShim extends BaseContractShim<
    ContractType<typeof INodeOperator__factory.connect>
> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, INodeOperator__factory.connect.bind(INodeOperator__factory))
    }
}
