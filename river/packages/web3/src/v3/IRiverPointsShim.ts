import {
    IRiverPoints as DevContract,
    IRiverPointsInterface as DevInterface,
} from '@river-build/generated/dev/typings/IRiverPoints'

import DevAbi from '@river-build/generated/dev/abis/IRiverPoints.abi.json' assert { type: 'json' }

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'

export class IRiverPointsShim extends BaseContractShim<DevContract, DevInterface> {
    constructor(address: string, provider: ethers.providers.Provider | undefined) {
        super(address, provider, DevAbi)
    }
}
