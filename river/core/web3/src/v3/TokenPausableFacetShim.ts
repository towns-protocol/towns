import {
    TokenPausableFacet as LocalhostContract,
    TokenPausableFacetInterface as LocalhostInterface,
} from '@river-build/generated/dev/typings/TokenPausableFacet'
import {
    TokenPausableFacet as BaseSepoliaContract,
    TokenPausableFacetInterface as BaseSepoliaInterface,
} from '@river-build/generated/v3/typings/TokenPausableFacet'

import LocalhostAbi from '@river-build/generated/dev/abis/TokenPausableFacet.abi.json' assert { type: 'json' }
import BaseSepoliaAbi from '@river-build/generated/v3/abis/TokenPausableFacet.abi.json' assert { type: 'json' }

import { BaseContractShim } from './BaseContractShim'
import { ethers } from 'ethers'

export class TokenPausableFacetShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    BaseSepoliaContract,
    BaseSepoliaInterface
> {
    constructor(address: string, chainId: number, provider: ethers.providers.Provider | undefined) {
        super(address, chainId, provider, {
            31337: LocalhostAbi,
            84532: BaseSepoliaAbi,
        })
    }
}
