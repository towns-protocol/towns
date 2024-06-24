import {
    IOperatorRegistry as DevContract,
    IOperatorRegistryInterface as DevInterface,
} from '@river-build/generated/dev/typings/IOperatorRegistry'
import {
    IOperatorRegistry as V3Contract,
    IOperatorRegistryInterface as V3Interface,
} from '@river-build/generated/v3/typings/IOperatorRegistry'

import DevAbi from '@river-build/generated/dev/abis/OperatorRegistry.abi.json' assert { type: 'json' }
import V3Abi from '@river-build/generated/v3/abis/OperatorRegistry.abi.json' assert { type: 'json' }

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'
import { ContractVersion } from '../IStaticContractsInfo'

export class IOperatorRegistryShim extends BaseContractShim<
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
