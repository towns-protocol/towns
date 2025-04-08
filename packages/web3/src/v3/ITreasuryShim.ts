import {
    ITreasury as LocalhostContract,
    ITreasuryInterface as LocalhostInterface,
} from '@towns-protocol/generated/dev/typings/ITreasury'

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'

import LocalhostAbi from '@towns-protocol/generated/dev/abis/ITreasury.abi.json' assert { type: 'json' }

export class ITreasuryShim extends BaseContractShim<LocalhostContract, LocalhostInterface> {
    constructor(address: string, provider: ethers.providers.Provider | undefined) {
        super(address, provider, LocalhostAbi)
    }
}
