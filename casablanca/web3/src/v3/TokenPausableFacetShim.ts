import {
    TokenPausableFacet as LocalhostContract,
    TokenPausableFacetInterface as LocalhostInterface,
} from '@towns/generated/localhost/v3/typings/TokenPausableFacet'
import {
    TokenPausableFacet as BaseGoerliContract,
    TokenPausableFacetInterface as BaseGoerliInterface,
} from '@towns/generated/base_goerli/v3/typings/TokenPausableFacet'

import LocalhostAbi from '@towns/generated/localhost/v3/abis/TokenPausableFacet.abi.json' assert { type: 'json' }

import BaseGoerliAbi from '@towns/generated/base_goerli/v3/abis/TokenPausableFacet.abi.json' assert { type: 'json' }
import { ethers } from 'ethers'

import { BaseContractShim } from './BaseContractShim'

export class TokenPausableFacetShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    BaseGoerliContract,
    BaseGoerliInterface
> {
    constructor(address: string, chainId: number, provider: ethers.providers.Provider | undefined) {
        super(address, chainId, provider, {
            localhostAbi: LocalhostAbi,
            baseGoerliAbi: BaseGoerliAbi,
        })
    }
}
