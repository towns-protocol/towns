import {
    ITownOwner as LocalhostContract,
    ITownOwnerBase as LocalhostITownOwnerBase,
    ITownOwnerInterface as LocalhostInterface,
} from '@towns/generated/dev/typings/ITownOwner'
import {
    ITownOwner as BaseSepoliaContract,
    ITownOwnerInterface as BaseSepoliaInterface,
} from '@towns/generated/v3/typings/ITownOwner'

import LocalhostAbi from '@towns/generated/dev/abis/TownOwner.abi.json' assert { type: 'json' }
import BaseSepoliaAbi from '@towns/generated/v3/abis/TownOwner.abi.json' assert { type: 'json' }

import { BaseContractShim } from './BaseContractShim'
import { ethers } from 'ethers'

export type { LocalhostITownOwnerBase as ITownOwnerBase }

export class ITownOwnerShim extends BaseContractShim<
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
