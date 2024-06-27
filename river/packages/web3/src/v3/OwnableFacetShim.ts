import {
    OwnableFacet as LocalhostContract,
    OwnableFacetInterface as LocalhostInterface,
} from '@river-build/generated/dev/typings/OwnableFacet'

import LocalhostAbi from '@river-build/generated/dev/abis/OwnableFacet.abi.json' assert { type: 'json' }

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'

export class OwnableFacetShim extends BaseContractShim<LocalhostContract, LocalhostInterface> {
    constructor(address: string, provider: ethers.providers.Provider | undefined) {
        super(address, provider, LocalhostAbi)
    }
}
