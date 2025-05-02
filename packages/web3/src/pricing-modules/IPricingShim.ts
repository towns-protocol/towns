import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { ContractType } from '../types/typechain'
import { IPricingModules__factory } from '@towns-protocol/generated/dev/typings/factories/IPricingModules__factory'

// TODO: extract from factory interface
export type { IPricingModulesBase } from '@towns-protocol/generated/dev/typings/IPricingModules'

export class IPricingShim extends BaseContractShim<
    ContractType<typeof IPricingModules__factory.connect>
> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, IPricingModules__factory.connect.bind(IPricingModules__factory))
    }
}
