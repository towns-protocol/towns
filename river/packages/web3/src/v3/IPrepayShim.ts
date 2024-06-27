import {
    PrepayFacet as LocalhostContract,
    PrepayFacetInterface as LocalhostInterface,
} from '@river-build/generated/dev/typings/PrepayFacet'

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'

import LocalhostAbi from '@river-build/generated/dev/abis/PrepayFacet.abi.json' assert { type: 'json' }

export class IPrepayShim extends BaseContractShim<LocalhostContract, LocalhostInterface> {
    constructor(address: string, provider: ethers.providers.Provider | undefined) {
        super(address, provider, LocalhostAbi)
    }
}
