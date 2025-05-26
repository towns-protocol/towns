import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { IPricingModules__factory } from '@towns-protocol/generated/dev/typings/factories/IPricingModules__factory'

const { abi, connect } = IPricingModules__factory

export type { IPricingModulesBase } from '@towns-protocol/generated/dev/typings/IPricingModules'

export class IPricingShim extends BaseContractShim<typeof connect> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }
}
