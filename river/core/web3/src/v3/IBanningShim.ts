import {
    IBanning as LocalhostContract,
    IBanningInterface as LocalhostInterface,
} from '@river-build/generated/dev/typings/IBanning'

import {
    IBanning as BaseSepoliaContract,
    IBanningInterface as BaseSepoliaInterface,
} from '@river-build/generated/v3/typings/IBanning'

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'
import { ContractVersion } from '../IStaticContractsInfo'

import LocalhostAbi from '@river-build/generated/dev/abis/IBanning.abi.json' assert { type: 'json' }
import BaseSepoliaAbi from '@river-build/generated/v3/abis/IBanning.abi.json' assert { type: 'json' }

export class IBanningShim extends BaseContractShim<
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
