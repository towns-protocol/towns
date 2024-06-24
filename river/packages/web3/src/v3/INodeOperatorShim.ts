import {
    INodeOperator as DevContract,
    INodeOperatorInterface as DevInterface,
} from '@river-build/generated/dev/typings/INodeOperator'
import {
    INodeOperator as V3Contract,
    INodeOperatorInterface as V3Interface,
} from '@river-build/generated/v3/typings/INodeOperator'

import DevAbi from '@river-build/generated/dev/abis/INodeOperator.abi.json' assert { type: 'json' }
import V3Abi from '@river-build/generated/v3/abis/INodeOperator.abi.json' assert { type: 'json' }

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'
import { ContractVersion } from '../IStaticContractsInfo'

export class INodeOperatorShim extends BaseContractShim<
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
