import {
    IOperatorRegistry as DevContract,
    IOperatorRegistryInterface as DevInterface,
} from '@river-build/generated/dev/typings/IOperatorRegistry'

import DevAbi from '@river-build/generated/dev/abis/OperatorRegistry.abi.json' assert { type: 'json' }

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'

export class IOperatorRegistryShim extends BaseContractShim<DevContract, DevInterface> {
    constructor(address: string, provider: ethers.providers.Provider | undefined) {
        super(address, provider, DevAbi)
    }
}
