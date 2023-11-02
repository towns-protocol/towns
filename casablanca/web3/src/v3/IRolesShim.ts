import {
    IRoles as LocalhostContract,
    IRolesBase as LocalhostIRolesBase,
    IRolesInterface as LocalhostInterface,
} from '@towns/generated/localhost/v3/typings/IRoles'
import {
    IRoles as BaseGoerliContract,
    IRolesInterface as BaseGoerliInterface,
} from '@towns/generated/base_goerli/v3/typings/IRoles'

import { BaseContractShim } from './BaseContractShim'

import LocalhostAbi from '@towns/generated/localhost/v3/abis/Roles.abi.json' assert { type: 'json' }

import BaseGoerliAbi from '@towns/generated/base_goerli/v3/abis/Roles.abi.json' assert { type: 'json' }

import { ethers } from 'ethers'

export type { LocalhostIRolesBase as IRolesBase }

export class IRolesShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    BaseGoerliContract,
    BaseGoerliInterface
> {
    constructor(address: string, chainId: number, provider: ethers.providers.Provider | undefined) {
        super(address, chainId, provider, {
            localhostAbi: LocalhostAbi,
            baseGoerliAbi: BaseGoerliAbi,
        })
    }
}
