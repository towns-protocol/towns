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
import {
    ITownArchitect as BaseSepoliaContract,
    ITownArchitectInterface as BaseSepoliaInterface,
} from '@towns/generated/base_sepolia/v3/typings/ITownArchitect'

import LocalhostAbi from '@towns/generated/localhost/v3/abis/TownArchitect.abi.json' assert { type: 'json' }
import BaseGoerliAbi from '@towns/generated/base_goerli/v3/abis/TownArchitect.abi.json' assert { type: 'json' }
import BaseSepoliaAbi from '@towns/generated/base_sepolia/v3/abis/TownArchitect.abi.json' assert { type: 'json' }

import { BaseContractShim } from './BaseContractShim'
import { ethers } from 'ethers'

export type { LocalhostIMembershipBase as IMembershipBase }
export type { LocalhostITownArchitectBase as ITownArchitectBase }

export class ITownArchitectShim extends BaseContractShim<
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
