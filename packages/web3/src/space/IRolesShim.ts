import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { ContractType } from '../types/typechain'
import { IRoles__factory } from '@towns-protocol/generated/dev/typings/factories/IRoles__factory'
import { IRolesBase } from '@towns-protocol/generated/dev/typings/IRoles'
export type { IRolesBase }

export class IRolesShim extends BaseContractShim<ContractType<typeof IRoles__factory.connect>> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, IRoles__factory.connect.bind(IRoles__factory))
    }
}
