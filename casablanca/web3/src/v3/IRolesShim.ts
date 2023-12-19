import {
    IRoles as LocalhostContract,
    IRolesBase as LocalhostIRolesBase,
    IRolesInterface as LocalhostInterface,
} from '@towns/generated/localhost/v3/typings/IRoles'
import {
    IRoles as BaseGoerliContract,
    IRolesInterface as BaseGoerliInterface,
} from '@towns/generated/base_goerli/v3/typings/IRoles'
import {
    IRoles as BaseSepoliaContract,
    IRolesInterface as BaseSepoliaInterface,
} from '@towns/generated/base_sepolia/v3/typings/IRoles'

import LocalhostAbi from '@towns/generated/localhost/v3/abis/Roles.abi.json' assert { type: 'json' }
import BaseGoerliAbi from '@towns/generated/base_goerli/v3/abis/Roles.abi.json' assert { type: 'json' }
import BaseSepoliaAbi from '@towns/generated/base_sepolia/v3/abis/Roles.abi.json' assert { type: 'json' }

import { BaseContractShim } from './BaseContractShim'
import { ethers } from 'ethers'

export type { LocalhostIRolesBase as IRolesBase }

export class IRolesShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    BaseGoerliContract,
    BaseGoerliInterface,
    BaseSepoliaContract,
    BaseSepoliaInterface
> {
    constructor(address: string, chainId: number, provider: ethers.providers.Provider | undefined) {
        super(address, chainId, provider, {
            localhostAbi: LocalhostAbi,
            baseGoerliAbi: BaseGoerliAbi,
            baseSepoliaAbi: BaseSepoliaAbi,
        })
    }
}
