import {
    IEntitlementChecker as DevContract,
    IEntitlementCheckerInterface as DevInterface,
} from '@towns-protocol/generated/dev/typings/IEntitlementChecker'

import DevAbi from '@towns-protocol/generated/dev/abis/IEntitlementChecker.abi.json' assert { type: 'json' }

import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'

export class IEntitlementCheckerShim extends BaseContractShim<DevContract, DevInterface> {
    constructor(address: string, provider: ethers.providers.Provider | undefined) {
        super(address, provider, DevAbi)
    }
}
