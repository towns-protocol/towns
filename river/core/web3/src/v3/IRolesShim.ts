import {
    IRoles as LocalhostContract,
    IRolesBase as LocalhostIRolesBase,
    IRolesInterface as LocalhostInterface,
} from '@river-build/generated/dev/typings/IRoles'
import {
    IRoles as BaseSepoliaContract,
    IRolesInterface as BaseSepoliaInterface,
} from '@river-build/generated/v3/typings/IRoles'

import LocalhostAbi from '@river-build/generated/dev/abis/Roles.abi.json' assert { type: 'json' }
import BaseSepoliaAbi from '@river-build/generated/v3/abis/Roles.abi.json' assert { type: 'json' }

import { BaseContractShim } from './BaseContractShim'
import { ethers } from 'ethers'

export type { LocalhostIRolesBase as IRolesBase }

export class IRolesShim extends BaseContractShim<
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
