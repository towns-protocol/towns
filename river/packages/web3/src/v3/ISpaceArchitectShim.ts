import {
    IMembershipBase as LocalhostIMembershipBase,
    IArchitect as LocalhostContract,
    IArchitectBase as LocalhostISpaceArchitectBase,
    IArchitectInterface as LocalhostInterface,
} from '@river-build/generated/dev/typings/IArchitect'
import {
    IArchitect as BaseSepoliaContract,
    IArchitectInterface as BaseSepoliaInterface,
} from '@river-build/generated/v3/typings/IArchitect'

import LocalhostAbi from '@river-build/generated/dev/abis/Architect.abi.json' assert { type: 'json' }
import BaseSepoliaAbi from '@river-build/generated/v3/abis/Architect.abi.json' assert { type: 'json' }

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'
import { ContractVersion } from '../IStaticContractsInfo'

export type { LocalhostIMembershipBase as IMembershipBase }
export type { LocalhostISpaceArchitectBase as IArchitectBase }

export class ISpaceArchitectShim extends BaseContractShim<
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
