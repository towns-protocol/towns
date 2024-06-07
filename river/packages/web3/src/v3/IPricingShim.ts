import {
    IPricingModules as LocalhostContract,
    IPricingModulesInterface as LocalhostInterface,
} from '@river-build/generated/dev/typings/IPricingModules'
export type { IPricingModulesBase } from '@river-build/generated/dev/typings/IPricingModules'

import {
    IPricingModules as BaseSepoliaContract,
    IPricingModulesInterface as BaseSepoliaInterface,
} from '@river-build/generated/v3/typings/IPricingModules'

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'
import { ContractVersion } from '../IStaticContractsInfo'

import LocalhostAbi from '@river-build/generated/dev/abis/IPricingModules.abi.json' assert { type: 'json' }
import BaseSepoliaAbi from '@river-build/generated/v3/abis/IPricingModules.abi.json' assert { type: 'json' }

export class IPricingShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    BaseSepoliaContract,
    BaseSepoliaInterface
> {
    constructor(
        address: string,
        version: ContractVersion,
        provider: ethers.providers.Provider | undefined,
    ) {
        super(address, version, provider, {
            [ContractVersion.dev]: LocalhostAbi,
            [ContractVersion.v3]: BaseSepoliaAbi,
        })
    }
}
