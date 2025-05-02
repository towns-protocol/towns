import { IMulticall__factory } from '@towns-protocol/generated/dev/typings/factories/IMulticall__factory'
import { ContractType } from '../types/typechain'
import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'

export class IMulticallShim extends BaseContractShim<
    ContractType<typeof IMulticall__factory.connect>
> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, IMulticall__factory.connect.bind(IMulticall__factory))
    }
}
