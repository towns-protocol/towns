import {
    MembershipFacet as LocalhostContract,
    MembershipFacetInterface as LocalhostInterface,
} from '@towns/generated/localhost/v3/typings/MembershipFacet'
import {
    MembershipFacet as BaseSepoliaContract,
    MembershipFacetInterface as BaseSepoliaInterface,
} from '@towns/generated/base_sepolia/v3/typings/MembershipFacet'

import { BaseContractShim } from '../v3/BaseContractShim'
import { ethers } from 'ethers'

import LocalhostAbi from '@towns/generated/localhost/v3/abis/MembershipFacet.abi.json' assert { type: 'json' }
import BaseSepoliaAbi from '@towns/generated/base_sepolia/v3/abis/MembershipFacet.abi.json' assert { type: 'json' }

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
