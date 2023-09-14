import {
    IRoles as GoerliContract,
    IRolesInterface as GoerliInterface,
} from '@towns/generated/goerli/v3/typings/IRoles'
import {
    IRoles as LocalhostContract,
    IRolesBase as LocalhostIRolesBase,
    IRolesInterface as LocalhostInterface,
} from '@towns/generated/localhost/v3/typings/IRoles'
import {
    IRoles as SepoliaContract,
    IRolesInterface as SepoliaInterface,
} from '@towns/generated/sepolia/v3/typings/IRoles'

import { BaseContractShimV3 } from './BaseContractShimV3'

import GoerliAbi from '@towns/generated/goerli/v3/abis/Roles.abi.json' assert { type: 'json' }

import LocalhostAbi from '@towns/generated/localhost/v3/abis/Roles.abi.json' assert { type: 'json' }

import SepoliaAbi from '@towns/generated/sepolia/v3/abis/Roles.abi.json' assert { type: 'json' }
import { ethers } from 'ethers'

export type { LocalhostIRolesBase as IRolesBase }

export class IRolesShim extends BaseContractShimV3<
    LocalhostContract,
    LocalhostInterface,
    GoerliContract,
    GoerliInterface,
    SepoliaContract,
    SepoliaInterface
> {
    constructor(address: string, chainId: number, provider: ethers.providers.Provider | undefined) {
        super(address, chainId, provider, {
            localhostAbi: LocalhostAbi,
            goerliAbi: GoerliAbi,
            sepoliaAbi: SepoliaAbi,
        })
    }
}
