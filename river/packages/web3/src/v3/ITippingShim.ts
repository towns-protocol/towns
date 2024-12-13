import {
    ITipping as LocalhostContract,
    ITippingInterface as LocalhostInterface,
} from '@river-build/generated/dev/typings/ITipping'

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'

import DevAbi from '@river-build/generated/dev/abis/ITipping.abi.json' assert { type: 'json' }

export class ITippingShim extends BaseContractShim<LocalhostContract, LocalhostInterface> {
    constructor(address: string, provider: ethers.providers.Provider | undefined) {
        super(address, provider, DevAbi)
    }
}
