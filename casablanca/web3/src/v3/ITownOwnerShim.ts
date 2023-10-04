import {
    ITownOwner as GoerliContract,
    ITownOwnerInterface as GoerliInterface,
} from '@towns/generated/goerli/v3/typings/ITownOwner'
import {
    ITownOwner as LocalhostContract,
    ITownOwnerBase as LocalhostITownOwnerBase,
    ITownOwnerInterface as LocalhostInterface,
} from '@towns/generated/localhost/v3/typings/ITownOwner'
import {
    ITownOwner as SepoliaContract,
    ITownOwnerInterface as SepoliaInterface,
} from '@towns/generated/sepolia/v3/typings/ITownOwner'
import {
    ITownOwner as BaseGoerliContract,
    ITownOwnerInterface as BaseGoerliInterface,
} from '@towns/generated/base_goerli/v3/typings/ITownOwner'

import { BaseContractShimV3 } from './BaseContractShimV3'

import GoerliAbi from '@towns/generated/goerli/v3/abis/TownOwner.abi.json' assert { type: 'json' }

import LocalhostAbi from '@towns/generated/localhost/v3/abis/TownOwner.abi.json' assert { type: 'json' }

import SepoliaAbi from '@towns/generated/sepolia/v3/abis/TownOwner.abi.json' assert { type: 'json' }
import BaseGoerliAbi from '@towns/generated/base_goerli/v3/abis/TownOwner.abi.json' assert { type: 'json' }
import { ethers } from 'ethers'

export type { LocalhostITownOwnerBase as ITownOwnerBase }

export class ITownOwnerShim extends BaseContractShimV3<
    LocalhostContract,
    LocalhostInterface,
    GoerliContract,
    GoerliInterface,
    SepoliaContract,
    SepoliaInterface,
    BaseGoerliContract,
    BaseGoerliInterface
> {
    constructor(address: string, chainId: number, provider: ethers.providers.Provider | undefined) {
        super(address, chainId, provider, {
            localhostAbi: LocalhostAbi,
            goerliAbi: GoerliAbi,
            sepoliaAbi: SepoliaAbi,
            baseGoerliAbi: BaseGoerliAbi,
        })
    }
}
