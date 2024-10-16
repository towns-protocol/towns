import {
    IArchitect as LocalhostContract,
    IArchitectInterface as LocalhostInterface,
} from '@river-build/generated/dev/typings/IArchitect'

import LocalhostAbi from '@river-build/generated/dev/abis/Architect.abi.json' assert { type: 'json' }

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'

export class ISpaceArchitectShim extends BaseContractShim<LocalhostContract, LocalhostInterface> {
    constructor(address: string, provider: ethers.providers.Provider | undefined) {
        super(address, provider, LocalhostAbi)
    }
}
