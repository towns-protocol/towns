import {
    ISpaceDelegation as DevContract,
    ISpaceDelegationInterface as DevInterface,
} from '@river-build/generated/dev/typings/ISpaceDelegation'

import DevAbi from '@river-build/generated/dev/abis/ISpaceDelegation.abi.json' assert { type: 'json' }

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'

export class ISpaceDelegationShim extends BaseContractShim<DevContract, DevInterface> {
    constructor(address: string, provider: ethers.providers.Provider | undefined) {
        super(address, provider, DevAbi)
    }
}
