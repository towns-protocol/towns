import {
    MembershipFacet as LocalhostContract,
    MembershipFacetInterface as LocalhostInterface,
} from '@towns/generated/localhost/v3/typings/MembershipFacet'

import {
    MembershipFacet as GoerliContract,
    MembershipFacetInterface as GoerliInterface,
} from '@towns/generated/goerli/v3/typings/MembershipFacet'

import {
    MembershipFacet as SepoliaContract,
    MembershipFacetInterface as SepoliaInterface,
} from '@towns/generated/sepolia/v3/typings/MembershipFacet'

import { BaseContractShimV3 } from '../v3/BaseContractShimV3'
import { ethers } from 'ethers'

import LocalhostAbi from '@towns/generated/localhost/v3/abis/MembershipFacet.abi.json' assert { type: 'json' }
import GoerliAbi from '@towns/generated/goerli/v3/abis/MembershipFacet.abi.json' assert { type: 'json' }
import SepoliaAbi from '@towns/generated/sepolia/v3/abis/MembershipFacet.abi.json' assert { type: 'json' }

export class IMembershipShim extends BaseContractShimV3<
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

    async hasMembership(wallet: string) {
        const balance = (await this.read.balanceOf(wallet)).toNumber()
        return balance > 0
    }
}
