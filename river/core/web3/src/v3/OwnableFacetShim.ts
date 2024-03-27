import {
    OwnableFacet as LocalhostContract,
    OwnableFacetInterface as LocalhostInterface,
} from '@river-build/generated/dev/typings/OwnableFacet'
import {
    OwnableFacet as BaseSepoliaContract,
    OwnableFacetInterface as BaseSepoliaInterface,
} from '@river-build/generated/v3/typings/OwnableFacet'

import LocalhostAbi from '@river-build/generated/dev/abis/OwnableFacet.abi.json' assert { type: 'json' }
import BaseSepoliaAbi from '@river-build/generated/v3/abis/OwnableFacet.abi.json' assert { type: 'json' }

import { BaseContractShim } from './BaseContractShim'
import { ethers } from 'ethers'

export class OwnableFacetShim extends BaseContractShim<
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
