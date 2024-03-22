import {
    IPricingModules as LocalhostContract,
    IPricingModulesInterface as LocalhostInterface,
} from '@river/generated/dev/typings/IPricingModules'
export type { IPricingModulesBase } from '@river/generated/dev/typings/IPricingModules'

import {
    IPricingModules as BaseSepoliaContract,
    IPricingModulesInterface as BaseSepoliaInterface,
} from '@river/generated/v3/typings/IPricingModules'

import { BaseContractShim } from '../v3/BaseContractShim'
import { ethers } from 'ethers'

import LocalhostAbi from '@river/generated/dev/abis/IPricingModules.abi.json' assert { type: 'json' }
import BaseSepoliaAbi from '@river/generated/v3/abis/IPricingModules.abi.json' assert { type: 'json' }

export class IPricingShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    BaseSepoliaContract,
    BaseSepoliaInterface
> {
    constructor(address: string, chainId: number, provider: ethers.providers.Provider | undefined) {
        super(address, chainId, provider, {
            31337: LocalhostAbi,
            84532: BaseSepoliaAbi,
        })
    }
}
