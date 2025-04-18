import {
    INodeOperator as DevContract,
    INodeOperatorInterface as DevInterface,
} from '@towns-protocol/generated/dev/typings/INodeOperator'

import DevAbi from '@towns-protocol/generated/dev/abis/INodeOperator.abi.json' with { type: 'json' }

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'

export class INodeOperatorShim extends BaseContractShim<DevContract, DevInterface> {
    constructor(address: string, provider: ethers.providers.Provider | undefined) {
        super(address, provider, DevAbi)
    }
}
