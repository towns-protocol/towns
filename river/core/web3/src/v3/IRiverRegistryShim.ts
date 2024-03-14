import {
    INodeRegistry as DevContract,
    INodeRegistryInterface as DevInterface,
} from '@river/generated/dev/typings/INodeRegistry'
import {
    INodeRegistry as V3Contract,
    INodeRegistryInterface as V3Interface,
} from '@river/generated/v3/typings/INodeRegistry'

import DevAbi from '@river/generated/dev/abis/NodeRegistry.abi.json' assert { type: 'json' }
import V3Abi from '@river/generated/v3/abis/NodeRegistry.abi.json' assert { type: 'json' }

import { BaseContractShim } from './BaseContractShim'
import { ethers } from 'ethers'

export class IRiverRegistryShim extends BaseContractShim<
    DevContract,
    DevInterface,
    V3Contract,
    V3Interface
> {
    constructor(address: string, chainId: number, provider: ethers.providers.Provider | undefined) {
        super(address, chainId, provider, {
            31338: DevAbi,
            6524490: V3Abi,
        })
    }
}
