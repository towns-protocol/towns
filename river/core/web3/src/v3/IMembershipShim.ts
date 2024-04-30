import {
    MembershipFacet as LocalhostContract,
    MembershipFacetInterface as LocalhostInterface,
} from '@river-build/generated/dev/typings/MembershipFacet'
import {
    MembershipFacet as BaseSepoliaContract,
    MembershipFacetInterface as BaseSepoliaInterface,
} from '@river-build/generated/v3/typings/MembershipFacet'

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'
import { ContractVersion } from '../IStaticContractsInfo'

import LocalhostAbi from '@river-build/generated/dev/abis/MembershipFacet.abi.json' assert { type: 'json' }
import BaseSepoliaAbi from '@river-build/generated/v3/abis/MembershipFacet.abi.json' assert { type: 'json' }

export class IMembershipShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    BaseSepoliaContract,
    BaseSepoliaInterface
> {
    constructor(
        address: string,
        version: ContractVersion,
        provider: ethers.providers.Provider | undefined,
    ) {
        super(address, version, provider, {
            [ContractVersion.dev]: LocalhostAbi,
            [ContractVersion.v3]: BaseSepoliaAbi,
        })
    }

    async hasMembership(wallet: string) {
        const balance = (await this.read.balanceOf(wallet)).toNumber()
        return balance > 0
    }

    async waitForMembershipTokenIssued(receiver: string): Promise<string> {
        const filter = this.read.filters['MembershipTokenIssued(address,uint256)'](receiver)

        return new Promise((resolve) => {
            // TODO: this isn't picking up correct typed fucntion signature
            this.read.once(filter as string, (recipient: string) => {
                resolve(recipient)
            })
        })
    }

    async waitForMembershipTokenRejected(receiver: string): Promise<string> {
        const filter = this.read.filters['MembershipTokenRejected(address)'](receiver)

        return new Promise((resolve) => {
            // TODO: this isn't picking up correct typed fucntion signature
            this.read.once(filter as string, (recipient: string) => {
                resolve(recipient)
            })
        })
    }
}
