import {
    IERC721AQueryable as LocalhostContract,
    IERC721AQueryableInterface as LocalhostInterface,
} from '@river-build/generated/dev/typings/IERC721AQueryable'

import {
    IERC721AQueryable as BaseSepoliaContract,
    IERC721AQueryableInterface as BaseSepoliaInterface,
} from '@river-build/generated/v3/typings/IERC721AQueryable'

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'
import { ContractVersion } from '../IStaticContractsInfo'

import LocalhostAbi from '@river-build/generated/dev/abis/IERC721AQueryable.abi.json' assert { type: 'json' }
import BaseSepoliaAbi from '@river-build/generated/v3/abis/IERC721AQueryable.abi.json' assert { type: 'json' }

export class IERC721AQueryableShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    BaseSepoliaContract,
    BaseSepoliaInterface
> {
    constructor(
        address: string,
        version: ContractVersion,
        provider: ethers.providers.Provider | undefined,
    ) {
        super(address, version, provider, {
            [ContractVersion.dev]: LocalhostAbi,
            [ContractVersion.v3]: BaseSepoliaAbi,
        })
    }
}
