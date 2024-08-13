import {
    ILegacyArchitect as LocalhostContract,
    ILegacyArchitectBase as LocalhostILegacySpaceArchitectBase,
    ILegacyArchitectInterface as LocalhostInterface,
} from '@river-build/generated/dev/typings/IMockLegacyArchitect.sol/ILegacyArchitect'

import LocalhostAbi from '@river-build/generated/dev/abis/MockLegacyArchitect.abi.json' assert { type: 'json' }

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'

export type { LocalhostILegacySpaceArchitectBase as ILegacyArchitectBase }

export class ILegacySpaceArchitectShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface
> {
    constructor(address: string, provider: ethers.providers.Provider | undefined) {
        super(address, provider, LocalhostAbi)
    }
}
