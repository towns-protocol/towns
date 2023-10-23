import {
    OwnableFacet as LocalhostContract,
    OwnableFacetInterface as LocalhostInterface,
} from '@towns/generated/localhost/v3/typings/OwnableFacet'
import {
    OwnableFacet as BaseGoerliContract,
    OwnableFacetInterface as BaseGoerliInterface,
} from '@towns/generated/base_goerli/v3/typings/OwnableFacet'

import LocalhostAbi from '@towns/generated/localhost/v3/abis/OwnableFacet.abi.json' assert { type: 'json' }

import BaseGoerliAbi from '@towns/generated/base_goerli/v3/abis/OwnableFacet.abi.json' assert { type: 'json' }
import { ethers } from 'ethers'

import { BaseContractShimV3 } from './BaseContractShimV3'

export class OwnableFacetShim extends BaseContractShimV3<
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
