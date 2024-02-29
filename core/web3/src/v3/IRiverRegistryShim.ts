import {
    IRiverRegistry as DevContract,
    IRiverRegistryInterface as DevInterface,
} from '@towns/generated/dev/typings/IRiverRegistry'
import {
    IRiverRegistry as V3Contract,
    IRiverRegistryInterface as V3Interface,
} from '@towns/generated/v3/typings/IRiverRegistry'

import DevAbi from '@towns/generated/dev/abis/RiverRegistry.abi.json' assert { type: 'json' }
import V3Abi from '@towns/generated/v3/abis/RiverRegistry.abi.json' assert { type: 'json' }

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
