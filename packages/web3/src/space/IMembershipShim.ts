import { BigNumber, ContractTransaction, ethers, Signer } from 'ethers'
import { BaseContractShim, OverrideExecution } from '../BaseContractShim'
import { dlogger } from '@towns-protocol/utils'
import { IMembershipMetadataShim } from './IMembershipMetadataShim'
import { MembershipFacet__factory } from '@towns-protocol/generated/dev/typings/factories/MembershipFacet__factory'
import { IERC721AShim } from '../erc-721/IERC721AShim'
import { IMulticallShim } from './IMulticallShim'
import { TransactionOpts } from '../types/ContractTypes'
const logger = dlogger('csb:IMembershipShim')

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
    // exmample:
    // const startListener = space.Membership.listenForMembershipToken({
    //     receiver: recipient,
    //     startingBlock: blockNumber,
    // })
    // await txn()
    // const result = await startListener()
    listenForMembershipToken(args: {
        receiver: string
        startingBlock: number
        providedAbortController?: AbortController
    }): () => Promise<{ issued: true; tokenId: string } | { issued: false; tokenId: undefined }> {
        const { receiver, providedAbortController, startingBlock } = args

        return async () => {
            const contract = this.read
            const provider = contract.provider
            const iface = contract.interface

            const issuedFilter =
                contract.filters['MembershipTokenIssued(address,uint256)'](receiver)
            const rejectedFilter = contract.filters['MembershipTokenRejected(address)'](receiver)

            const abortController = providedAbortController ?? new AbortController()
            const abortTimeout = providedAbortController
                ? undefined
                : setTimeout(() => {
                      logger.error('joinSpace timeout')
                      abortController.abort()
                  }, 20_000)

            const pollingInterval = 1_000
            let lastCheckedBlock = startingBlock

            return new Promise<
                { issued: true; tokenId: string } | { issued: false; tokenId: undefined }
            >((resolve) => {
                let active = true

                const cleanup = () => {
                    active = false
                    clearInterval(intervalId)
                    abortController.signal.removeEventListener('abort', onAbort)
                    if (abortTimeout) {
                        clearTimeout(abortTimeout)
                    }
                }

                const onAbort = () => {
                    cleanup()
                    resolve({ issued: false, tokenId: undefined })
                }

                abortController.signal.addEventListener('abort', onAbort)

                const intervalId = setInterval(() => {
                    void (async () => {
                        if (!active) {
                            return
                        }

                        const currentBlock = await provider.getBlockNumber()
                        if (currentBlock <= lastCheckedBlock) {
                            return
                        }

                        try {
                            // check for both issued and rejected logs
                            const [issuedLogs, rejectedLogs] = await Promise.all([
                                provider.getLogs({
                                    ...issuedFilter,
                                    fromBlock: lastCheckedBlock + 1,
                                    toBlock: currentBlock,
                                }),
                                provider.getLogs({
                                    ...rejectedFilter,
                                    fromBlock: lastCheckedBlock + 1,
                                    toBlock: currentBlock,
                                }),
                            ])

                            for (const log of issuedLogs) {
                                const parsed = iface.parseLog(log)
                                const { recipient, tokenId } = parsed.args
                                if (
                                    recipient &&
                                    typeof recipient === 'string' &&
                                    recipient === receiver
                                ) {
                                    logger.log('MembershipTokenIssued', {
                                        receiver,
                                        recipient,
                                        tokenId,
                                    })
                                    cleanup()
                                    resolve({
                                        issued: true,
                                        tokenId: BigNumber.from(tokenId).toString(),
                                    })
                                    return
                                }
                            }

                            for (const log of rejectedLogs) {
                                const parsed = iface.parseLog(log)
                                const { recipient } = parsed.args
                                if (recipient === receiver) {
                                    logger.log('MembershipTokenRejected', { receiver, recipient })
                                    cleanup()
                                    resolve({ issued: false, tokenId: undefined })
                                    return
                                }
                            }

                            lastCheckedBlock = currentBlock
                        } catch (err) {
                            logger.error('Log polling error', err)
                        }
                    })()
                }, pollingInterval)
            })
        }
    }
}
