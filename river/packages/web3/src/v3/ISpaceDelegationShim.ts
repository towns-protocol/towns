import {
    ISpaceDelegation as DevContract,
    ISpaceDelegationInterface as DevInterface,
} from '@river-build/generated/dev/typings/ISpaceDelegation'
import {
    ISpaceDelegation as V3Contract,
    ISpaceDelegationInterface as V3Interface,
} from '@river-build/generated/v3/typings/ISpaceDelegation'

import DevAbi from '@river-build/generated/dev/abis/ISpaceDelegation.abi.json' assert { type: 'json' }
import V3Abi from '@river-build/generated/v3/abis/ISpaceDelegation.abi.json' assert { type: 'json' }

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'
import { ContractVersion } from '../IStaticContractsInfo'

export class ISpaceDelegationShim extends BaseContractShim<
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
