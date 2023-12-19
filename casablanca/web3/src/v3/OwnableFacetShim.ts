import {
    OwnableFacet as LocalhostContract,
    OwnableFacetInterface as LocalhostInterface,
} from '@towns/generated/localhost/v3/typings/OwnableFacet'
import {
    OwnableFacet as BaseSepoliaContract,
    OwnableFacetInterface as BaseSepoliaInterface,
} from '@towns/generated/base_sepolia/v3/typings/OwnableFacet'

import LocalhostAbi from '@towns/generated/localhost/v3/abis/OwnableFacet.abi.json' assert { type: 'json' }
import BaseSepoliaAbi from '@towns/generated/base_sepolia/v3/abis/OwnableFacet.abi.json' assert { type: 'json' }

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
