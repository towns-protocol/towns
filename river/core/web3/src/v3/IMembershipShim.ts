import {
    MembershipFacet as LocalhostContract,
    MembershipFacetInterface as LocalhostInterface,
} from '@river-build/generated/dev/typings/MembershipFacet'
import {
    MembershipFacet as BaseSepoliaContract,
    MembershipFacetInterface as BaseSepoliaInterface,
} from '@river-build/generated/v3/typings/MembershipFacet'

import { BaseContractShim } from '../v3/BaseContractShim'
import { ethers } from 'ethers'

import LocalhostAbi from '@river-build/generated/dev/abis/MembershipFacet.abi.json' assert { type: 'json' }
import BaseSepoliaAbi from '@river-build/generated/v3/abis/MembershipFacet.abi.json' assert { type: 'json' }

export class IMembershipShim extends BaseContractShim<
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

    async hasMembership(wallet: string) {
        const balance = (await this.read.balanceOf(wallet)).toNumber()
        return balance > 0
    }
}
