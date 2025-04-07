import {
    INodeRegistry as DevContract,
    INodeRegistryInterface as DevInterface,
} from '@towns-protocol/generated/dev/typings/INodeRegistry'

import DevAbi from '@towns-protocol/generated/dev/abis/NodeRegistry.abi.json' assert { type: 'json' }

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'

export class INodeRegistryShim extends BaseContractShim<DevContract, DevInterface> {
    constructor(address: string, provider: ethers.providers.Provider | undefined) {
        super(address, provider, DevAbi)
    }
}
