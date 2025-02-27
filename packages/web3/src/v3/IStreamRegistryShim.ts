import {
    IStreamRegistry as DevContract,
    IStreamRegistryInterface as DevInterface,
} from '@towns-protocol/generated/dev/typings/IStreamRegistry'

import DevAbi from '@towns-protocol/generated/dev/abis/StreamRegistry.abi.json' assert { type: 'json' }

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'

export class IStreamRegistryShim extends BaseContractShim<DevContract, DevInterface> {
    constructor(address: string, provider: ethers.providers.Provider | undefined) {
        super(address, provider, DevAbi)
    }
}
