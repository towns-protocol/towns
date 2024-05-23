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

    // If the caller doesn't provide an abort controller, create one and set a timeout
    // to abort the call after 20 seconds.
    async listenForMembershipToken(
        receiver: string,
        providedAbortController?: AbortController,
    ): Promise<{ issued: true; tokenId: string } | { issued: false; tokenId: undefined }> {
        //
        const timeoutController = providedAbortController ? undefined : new AbortController()

        const abortTimeout = providedAbortController
            ? undefined
            : setTimeout(() => {
                  log.error('joinSpace timeout')
                  timeoutController?.abort()
              }, 20_000)

        const abortController = providedAbortController ?? timeoutController!
        // TODO: this isn't picking up correct typed fucntion signature, treating as string
        const issuedFilter = this.read.filters['MembershipTokenIssued(address,uint256)'](
            receiver,
        ) as string
        const rejectedFilter = this.read.filters['MembershipTokenRejected(address)'](
            receiver,
        ) as string

        return new Promise<
            { issued: true; tokenId: string } | { issued: false; tokenId: undefined }
        >((resolve, _reject) => {
            const cleanup = () => {
                this.read.off(issuedFilter, issuedListener)
                this.read.off(rejectedFilter, rejectedListener)
                abortController.signal.removeEventListener('abort', onAbort)
                clearTimeout(abortTimeout)
            }
            const onAbort = () => {
                cleanup()
                resolve({ issued: false, tokenId: undefined })
            }
            const issuedListener = (recipient: string, tokenId: BigNumberish) => {
                if (receiver === recipient) {
                    log.log('MembershipTokenIssued', { receiver, recipient, tokenId })
                    cleanup()
                    resolve({ issued: true, tokenId: BigNumber.from(tokenId).toString() })
                } else {
                    // This techincally should never happen, but we should log it
                    log.log('MembershipTokenIssued mismatch', { receiver, recipient, tokenId })
                }
            }

            const rejectedListener = (recipient: string) => {
                if (receiver === recipient) {
                    cleanup()
                    resolve({ issued: false, tokenId: undefined })
                } else {
                    // This techincally should never happen, but we should log it
                    log.log('MembershipTokenIssued mismatch', { receiver, recipient })
                }
            }

            this.read.on(issuedFilter, issuedListener)
            this.read.on(rejectedFilter, rejectedListener)
            abortController.signal.addEventListener('abort', onAbort)
        })
    }
}
