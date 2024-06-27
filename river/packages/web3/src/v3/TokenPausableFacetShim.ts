import {
    TokenPausableFacet as LocalhostContract,
    TokenPausableFacetInterface as LocalhostInterface,
} from '@river-build/generated/dev/typings/TokenPausableFacet'

import LocalhostAbi from '@river-build/generated/dev/abis/TokenPausableFacet.abi.json' assert { type: 'json' }

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'

export class TokenPausableFacetShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface
> {
    constructor(address: string, provider: ethers.providers.Provider | undefined) {
        super(address, provider, LocalhostAbi)
    }
}
