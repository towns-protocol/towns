import {
    IMembershipBase as LocalhostIMembershipBase,
    ITownArchitect as LocalhostContract,
    ITownArchitectBase as LocalhostITownArchitectBase,
    ITownArchitectInterface as LocalhostInterface,
} from '@towns/generated/dev/typings/ITownArchitect'
import {
    ITownArchitect as BaseSepoliaContract,
    ITownArchitectInterface as BaseSepoliaInterface,
} from '@towns/generated/v3/typings/ITownArchitect'

import LocalhostAbi from '@towns/generated/dev/abis/TownArchitect.abi.json' assert { type: 'json' }
import BaseSepoliaAbi from '@towns/generated/v3/abis/TownArchitect.abi.json' assert { type: 'json' }

import { BaseContractShim } from './BaseContractShim'
import { ethers } from 'ethers'

export type { LocalhostIMembershipBase as IMembershipBase }
export type { LocalhostITownArchitectBase as ITownArchitectBase }

export class ITownArchitectShim extends BaseContractShim<
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
