import {
    ISpaceOwner as LocalhostContract,
    ISpaceOwnerBase as LocalhostITownOwnerBase,
    ISpaceOwnerInterface as LocalhostInterface,
} from '@river/generated/dev/typings/ISpaceOwner'
import {
    ISpaceOwner as BaseSepoliaContract,
    ISpaceOwnerInterface as BaseSepoliaInterface,
} from '@river/generated/v3/typings/ISpaceOwner'

import LocalhostAbi from '@river/generated/dev/abis/SpaceOwner.abi.json' assert { type: 'json' }
import BaseSepoliaAbi from '@river/generated/v3/abis/SpaceOwner.abi.json' assert { type: 'json' }

import { BaseContractShim } from './BaseContractShim'
import { ethers } from 'ethers'

export type { LocalhostITownOwnerBase as ISpaceOwnerBase }

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
