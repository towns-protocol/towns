import {
    IEntitlementChecker as DevContract,
    IEntitlementCheckerInterface as DevInterface,
} from '@river-build/generated/dev/typings/IEntitlementChecker'
import {
    IEntitlementChecker as V3Contract,
    IEntitlementCheckerInterface as V3Interface,
} from '@river-build/generated/v3/typings/IEntitlementChecker'

import DevAbi from '@river-build/generated/dev/abis/IEntitlementChecker.abi.json' assert { type: 'json' }
import V3Abi from '@river-build/generated/v3/abis/IEntitlementChecker.abi.json' assert { type: 'json' }

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'
import { ContractVersion } from '../IStaticContractsInfo'

export class IEntitlementCheckerShim extends BaseContractShim<
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
