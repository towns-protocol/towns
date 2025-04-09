import {
    IDropFacet as DevContract,
    IDropFacetInterface as DevInterface,
} from '@towns-protocol/generated/dev/typings/IDropFacet'

import DevAbi from '@towns-protocol/generated/dev/abis/DropFacet.abi.json' with { type: 'json' }

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'

export class IDropFacetShim extends BaseContractShim<DevContract, DevInterface> {
    constructor(address: string, provider: ethers.providers.Provider | undefined) {
        super(address, provider, DevAbi)
    }
}
