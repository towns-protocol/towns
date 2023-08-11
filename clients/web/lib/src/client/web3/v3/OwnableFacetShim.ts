import {
    OwnableFacet as GoerliContract,
    OwnableFacetInterface as GoerliInterface,
} from '@towns/generated/goerli/v3/typings/OwnableFacet'
import {
    OwnableFacet as LocalhostContract,
    OwnableFacetInterface as LocalhostInterface,
} from '@towns/generated/localhost/v3/typings/OwnableFacet'
import {
    OwnableFacet as SepoliaContract,
    OwnableFacetInterface as SepoliaInterface,
} from '@towns/generated/sepolia/v3/typings/OwnableFacet'

import GoerliAbi from '@towns/generated/goerli/v3/abis/OwnableFacet.abi.json' assert { type: 'json' }

import LocalhostAbi from '@towns/generated/localhost/v3/abis/OwnableFacet.abi.json' assert { type: 'json' }

import SepoliaAbi from '@towns/generated/sepolia/v3/abis/OwnableFacet.abi.json' assert { type: 'json' }
import { ethers } from 'ethers'

import { BaseContractShimV3 } from './BaseContractShimV3'

export class OwnableFacetShim extends BaseContractShimV3<
    LocalhostContract,
    LocalhostInterface,
    GoerliContract,
    GoerliInterface,
    SepoliaContract,
    SepoliaInterface
> {
    constructor(address: string, chainId: number, provider: ethers.providers.Provider | undefined) {
        super(address, chainId, provider, {
            localhostAbi: LocalhostAbi,
            goerliAbi: GoerliAbi,
            sepoliaAbi: SepoliaAbi,
        })
    }
}
