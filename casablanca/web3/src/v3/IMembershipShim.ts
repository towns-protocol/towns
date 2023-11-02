import {
    MembershipFacet as LocalhostContract,
    MembershipFacetInterface as LocalhostInterface,
} from '@towns/generated/localhost/v3/typings/MembershipFacet'

import {
    MembershipFacet as BaseGoerliContract,
    MembershipFacetInterface as BaseGoerliInterface,
} from '@towns/generated/base_goerli/v3/typings/MembershipFacet'

import { BaseContractShim } from '../v3/BaseContractShim'
import { ethers } from 'ethers'

import LocalhostAbi from '@towns/generated/localhost/v3/abis/MembershipFacet.abi.json' assert { type: 'json' }
import BaseGoerliAbi from '@towns/generated/base_goerli/v3/abis/MembershipFacet.abi.json' assert { type: 'json' }

export class IMembershipShim extends BaseContractShim<
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

    async hasMembership(wallet: string) {
        const balance = (await this.read.balanceOf(wallet)).toNumber()
        return balance > 0
    }
}
