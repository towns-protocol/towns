import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { IBanning__factory } from '@towns-protocol/generated/dev/typings/factories/IBanning__factory'
import { ContractType } from '../types/typechain'

export class IBanningShim extends BaseContractShim<ContractType<typeof IBanning__factory.connect>> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, IBanning__factory.connect.bind(IBanning__factory))
    }
}
