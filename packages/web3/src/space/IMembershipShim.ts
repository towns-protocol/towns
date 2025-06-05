import { BigNumber, BigNumberish, ContractTransaction, ethers, Signer } from 'ethers'
import { BaseContractShim, OverrideExecution } from '../BaseContractShim'
import { dlogger } from '@towns-protocol/dlog'
import { IMembershipMetadataShim } from './IMembershipMetadataShim'
import { MembershipFacet__factory } from '@towns-protocol/generated/dev/typings/factories/MembershipFacet__factory'
import { IERC721AShim } from '../erc-721/IERC721AShim'
import { IMulticallShim } from './IMulticallShim'
import { TransactionOpts } from 'types/ContractTypes'
const log = dlogger('csb:IMembershipShim')

const { abi, connect } = MembershipFacet__factory

export class IMembershipShim extends BaseContractShim<typeof connect> {
    private erc721Shim: IERC721AShim
    metadata: IMembershipMetadataShim
    multicall: IMulticallShim

    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
        this.erc721Shim = new IERC721AShim(address, provider)
        this.metadata = new IMembershipMetadataShim(address, provider)
        this.multicall = new IMulticallShim(address, provider)
    }

    public async getMembershipRenewalPrice(tokenId: string) {
        return (await this.read.getMembershipRenewalPrice(tokenId)).toBigInt()
    }

    public async renewMembership<T = ContractTransaction>(args: {
        tokenId: string
        signer: Signer
        overrideExecution?: OverrideExecution<T>
        transactionOpts?: TransactionOpts
    }) {
        const { tokenId, signer, overrideExecution, transactionOpts } = args
        const renewalPrice = await this.getMembershipRenewalPrice(tokenId)

        return this.executeCall({
            signer,
            functionName: 'renewMembership',
            args: [tokenId],
            value: renewalPrice,
            overrideExecution,
            transactionOpts,
        })
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
        // TODO: this isn't picking up correct typed function signature, treating as string
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
