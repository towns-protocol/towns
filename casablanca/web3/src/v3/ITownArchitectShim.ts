import {
    IMembershipBase as LocalhostIMembershipBase,
    ITownArchitect as LocalhostContract,
    ITownArchitectBase as LocalhostITownArchitectBase,
    ITownArchitectInterface as LocalhostInterface,
} from '@towns/generated/localhost/v3/typings/ITownArchitect'
import {
    ITownArchitect as BaseGoerliContract,
    ITownArchitectInterface as BaseGoerliInterface,
} from '@towns/generated/base_goerli/v3/typings/ITownArchitect'

import LocalhostAbi from '@towns/generated/localhost/v3/abis/TownArchitect.abi.json' assert { type: 'json' }

import BaseGoerliAbi from '@towns/generated/base_goerli/v3/abis/TownArchitect.abi.json' assert { type: 'json' }

import { BaseContractShimV3 } from './BaseContractShimV3'
import { ethers } from 'ethers'

export type { LocalhostIMembershipBase as IMembershipBase }
export type { LocalhostITownArchitectBase as ITownArchitectBase }

export class ITownArchitectShim extends BaseContractShimV3<
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
