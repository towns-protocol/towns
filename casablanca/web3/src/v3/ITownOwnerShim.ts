import {
    ITownOwner as LocalhostContract,
    ITownOwnerBase as LocalhostITownOwnerBase,
    ITownOwnerInterface as LocalhostInterface,
} from '@towns/generated/localhost/v3/typings/ITownOwner'
import {
    ITownOwner as BaseGoerliContract,
    ITownOwnerInterface as BaseGoerliInterface,
} from '@towns/generated/base_goerli/v3/typings/ITownOwner'

import { BaseContractShim } from './BaseContractShim'

import LocalhostAbi from '@towns/generated/localhost/v3/abis/TownOwner.abi.json' assert { type: 'json' }

import BaseGoerliAbi from '@towns/generated/base_goerli/v3/abis/TownOwner.abi.json' assert { type: 'json' }
import { ethers } from 'ethers'

export type { LocalhostITownOwnerBase as ITownOwnerBase }

export class ITownOwnerShim extends BaseContractShim<
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
