import {
    INodeRegistry as DevContract,
    INodeRegistryInterface as DevInterface,
} from '@river-build/generated/dev/typings/INodeRegistry'
import {
    INodeRegistry as V3Contract,
    INodeRegistryInterface as V3Interface,
} from '@river-build/generated/v3/typings/INodeRegistry'

import DevAbi from '@river-build/generated/dev/abis/NodeRegistry.abi.json' assert { type: 'json' }
import V3Abi from '@river-build/generated/v3/abis/NodeRegistry.abi.json' assert { type: 'json' }

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'
import { ContractVersion } from '../IStaticContractsInfo'

export class IRiverRegistryShim extends BaseContractShim<
    DevContract,
    DevInterface,
    V3Contract,
    V3Interface
> {
    constructor(
        address: string,
        version: ContractVersion,
        provider: ethers.providers.Provider | undefined,
    ) {
        super(address, version, provider, {
            [ContractVersion.dev]: DevAbi,
            [ContractVersion.v3]: V3Abi,
        })
    }
}
