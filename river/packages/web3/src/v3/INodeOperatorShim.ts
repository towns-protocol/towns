import {
    INodeOperator as DevContract,
    INodeOperatorInterface as DevInterface,
} from '@river-build/generated/dev/typings/INodeOperator'

import DevAbi from '@river-build/generated/dev/abis/INodeOperator.abi.json' assert { type: 'json' }

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'

export class INodeOperatorShim extends BaseContractShim<DevContract, DevInterface> {
    constructor(address: string, provider: ethers.providers.Provider | undefined) {
        super(address, provider, DevAbi)
    }
}
