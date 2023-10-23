import {
    PioneerFacet as BaseGoerliContract,
    PioneerFacetInterface as BaseGoerliInterface,
} from '@towns/generated/base_goerli/v3/typings/PioneerFacet'
import {
    PioneerFacet as LocalhostContract,
    PioneerFacetInterface as LocalhostInterface,
} from '@towns/generated/localhost/v3/typings/PioneerFacet'

import LocalhostAbi from '@towns/generated/localhost/abis/Pioneer.abi.json' assert { type: 'json' }
import BaseGoerliAbi from '@towns/generated/base_goerli/abis/Pioneer.abi.json' assert { type: 'json' }

import { BaseContractShimV3 } from '../v3/BaseContractShimV3'
import { ethers } from 'ethers'

export class PioneerNFTShim extends BaseContractShimV3<
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
