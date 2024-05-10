import {
    MembershipFacet as LocalhostContract,
    MembershipFacetInterface as LocalhostInterface,
} from '@river-build/generated/dev/typings/MembershipFacet'
import {
    MembershipFacet as BaseSepoliaContract,
    MembershipFacetInterface as BaseSepoliaInterface,
} from '@river-build/generated/v3/typings/MembershipFacet'

import { BigNumber, BigNumberish, ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'
import { ContractVersion } from '../IStaticContractsInfo'

import LocalhostAbi from '@river-build/generated/dev/abis/MembershipFacet.abi.json' assert { type: 'json' }
import BaseSepoliaAbi from '@river-build/generated/v3/abis/MembershipFacet.abi.json' assert { type: 'json' }
import { dlogger } from '@river-build/dlog'

const log = dlogger('csb:IMembershipShim')

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

    async listenForMembershipToken(
        receiver: string,
        abortController?: AbortController,
    ): Promise<{ issued: true; tokenId: string } | { issued: false; tokenId: undefined }> {
        // TODO: this isn't picking up correct typed fucntion signature
        const issuedFilter = this.read.filters['MembershipTokenIssued(address,uint256)'](
            receiver,
        ) as string
        const rejectedFilter = this.read.filters['MembershipTokenRejected(address)'](
            receiver,
        ) as string

        return new Promise((resolve, reject) => {
            const issuedListener = (recipient: string, tokenId: BigNumberish) => {
                this.read.off(issuedFilter, issuedListener)
                this.read.off(rejectedFilter, rejectedListener)

                if (receiver !== recipient) {
                    log.error('Received event for wrong recipient', { receiver, recipient })
                    reject(new Error('Received event for wrong recipient'))
                }
                resolve({ issued: true, tokenId: BigNumber.from(tokenId).toString() })
            }

            const rejectedListener = (recipient: string) => {
                this.read.off(issuedFilter, issuedListener)
                this.read.off(rejectedFilter, rejectedListener)
                if (receiver !== recipient) {
                    log.error('Received event for wrong recipient', { receiver, recipient })
                    reject(new Error('Received event for wrong recipient'))
                }
                resolve({ issued: false, tokenId: undefined })
            }

            this.read.on(issuedFilter, issuedListener)
            this.read.on(rejectedFilter, rejectedListener)

            if (abortController) {
                abortController.signal.addEventListener('abort', () => {
                    this.read.off(issuedFilter, issuedListener)
                    this.read.off(rejectedFilter, rejectedListener)
                })
            }
        })
    }
}
