import {
    IMembershipBase as LocalhostIMembershipBase,
    IArchitect as LocalhostContract,
    IArchitectBase as LocalhostITownArchitectBase,
    IArchitectInterface as LocalhostInterface,
} from '@river/generated/dev/typings/IArchitect'
import {
    IArchitect as BaseSepoliaContract,
    IArchitectInterface as BaseSepoliaInterface,
} from '@river/generated/v3/typings/IArchitect'

import LocalhostAbi from '@river/generated/dev/abis/Architect.abi.json' assert { type: 'json' }
import BaseSepoliaAbi from '@river/generated/v3/abis/Architect.abi.json' assert { type: 'json' }

import { BaseContractShim } from './BaseContractShim'
import { ethers } from 'ethers'

export type { LocalhostIMembershipBase as IMembershipBase }
export type { LocalhostITownArchitectBase as IArchitectBase }

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
