import {
    IRoles as LocalhostContract,
    IRolesBase as LocalhostIRolesBase,
    IRolesInterface as LocalhostInterface,
} from '@river-build/generated/dev/typings/IRoles'

import LocalhostAbi from '@river-build/generated/dev/abis/Roles.abi.json' assert { type: 'json' }

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'

export type { LocalhostIRolesBase as IRolesBase }

export class IRolesShim extends BaseContractShim<LocalhostContract, LocalhostInterface> {
    constructor(address: string, provider: ethers.providers.Provider | undefined) {
        super(address, provider, LocalhostAbi)
    }
}
