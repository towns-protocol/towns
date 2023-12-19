import {
    TokenPausableFacet as LocalhostContract,
    TokenPausableFacetInterface as LocalhostInterface,
} from '@towns/generated/localhost/v3/typings/TokenPausableFacet'
import {
    TokenPausableFacet as BaseGoerliContract,
    TokenPausableFacetInterface as BaseGoerliInterface,
} from '@towns/generated/base_goerli/v3/typings/TokenPausableFacet'
import {
    TokenPausableFacet as BaseSepoliaContract,
    TokenPausableFacetInterface as BaseSepoliaInterface,
} from '@towns/generated/base_sepolia/v3/typings/TokenPausableFacet'

import LocalhostAbi from '@towns/generated/localhost/v3/abis/TokenPausableFacet.abi.json' assert { type: 'json' }
import BaseGoerliAbi from '@towns/generated/base_goerli/v3/abis/TokenPausableFacet.abi.json' assert { type: 'json' }
import BaseSepoliaAbi from '@towns/generated/base_sepolia/v3/abis/TokenPausableFacet.abi.json' assert { type: 'json' }

import { BaseContractShim } from './BaseContractShim'
import { ethers } from 'ethers'

export class TokenPausableFacetShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    BaseGoerliContract,
    BaseGoerliInterface,
    BaseSepoliaContract,
    BaseSepoliaInterface
> {
    constructor(address: string, chainId: number, provider: ethers.providers.Provider | undefined) {
        super(address, chainId, provider, {
            localhostAbi: LocalhostAbi,
            baseGoerliAbi: BaseGoerliAbi,
            baseSepoliaAbi: BaseSepoliaAbi,
        })
    }
}
