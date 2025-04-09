import {
    IBanning as LocalhostContract,
    IBanningInterface as LocalhostInterface,
} from '@towns-protocol/generated/dev/typings/IBanning'

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'

import LocalhostAbi from '@towns-protocol/generated/dev/abis/IBanning.abi.json' with { type: 'json' }

export class IBanningShim extends BaseContractShim<LocalhostContract, LocalhostInterface> {
    constructor(address: string, provider: ethers.providers.Provider | undefined) {
        super(address, provider, LocalhostAbi)
    }
}
