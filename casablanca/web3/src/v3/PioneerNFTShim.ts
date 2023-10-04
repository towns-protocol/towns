/* eslint-disable no-restricted-imports */

import {
    PioneerFacet as GoerliContract,
    PioneerFacetInterface as GoerliInterface,
} from '@towns/generated/goerli/v3/typings/PioneerFacet'

import {
    PioneerFacet as SepoliaContract,
    PioneerFacetInterface as SepoliaInterface,
} from '@towns/generated/sepolia/v3/typings/PioneerFacet'
import {
    PioneerFacet as BaseGoerliContract,
    PioneerFacetInterface as BaseGoerliInterface,
} from '@towns/generated/base_goerli/v3/typings/PioneerFacet'
import {
    PioneerFacet as LocalhostContract,
    PioneerFacetInterface as LocalhostInterface,
} from '@towns/generated/localhost/v3/typings/PioneerFacet'

import GoerliAbi from '@towns/generated/goerli/abis/Pioneer.abi.json' assert { type: 'json' }
import LocalhostAbi from '@towns/generated/localhost/abis/Pioneer.abi.json' assert { type: 'json' }
import SepoliaAbi from '@towns/generated/sepolia/abis/Pioneer.abi.json' assert { type: 'json' }
import BaseGoerliAbi from '@towns/generated/base_goerli/abis/Pioneer.abi.json' assert { type: 'json' }

import { BaseContractShimV3 } from '../v3/BaseContractShimV3'
import { ethers } from 'ethers'

export class PioneerNFTShim extends BaseContractShimV3<
    LocalhostContract,
    LocalhostInterface,
    GoerliContract,
    GoerliInterface,
    SepoliaContract,
    SepoliaInterface,
    BaseGoerliContract,
    BaseGoerliInterface
> {
    constructor(address: string, chainId: number, provider: ethers.providers.Provider | undefined) {
        super(address, chainId, provider, {
            localhostAbi: LocalhostAbi,
            goerliAbi: GoerliAbi,
            sepoliaAbi: SepoliaAbi,
            baseGoerliAbi: BaseGoerliAbi,
        })
    }
}
