import {
    IDropFacet as DevContract,
    IDropFacetInterface as DevInterface,
} from '@river-build/generated/dev/typings/IDropFacet'

import DevAbi from '@river-build/generated/dev/abis/DropFacet.abi.json' assert { type: 'json' }

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'

export class IDropFacetShim extends BaseContractShim<DevContract, DevInterface> {
    constructor(address: string, provider: ethers.providers.Provider | undefined) {
        super(address, provider, DevAbi)
    }
}
