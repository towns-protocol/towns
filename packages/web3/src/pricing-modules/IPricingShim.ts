import {
    IPricingModules as LocalhostContract,
    IPricingModulesInterface as LocalhostInterface,
} from '@towns-protocol/generated/dev/typings/IPricingModules'
export type { IPricingModulesBase } from '@towns-protocol/generated/dev/typings/IPricingModules'

import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'

import LocalhostAbi from '@towns-protocol/generated/dev/abis/IPricingModules.abi.json' assert { type: 'json' }

export class IPricingShim extends BaseContractShim<LocalhostContract, LocalhostInterface> {
    constructor(address: string, provider: ethers.providers.Provider | undefined) {
        super(address, provider, LocalhostAbi)
    }
}
