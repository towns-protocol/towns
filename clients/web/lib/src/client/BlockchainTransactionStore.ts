import EventEmitter from 'events'
import TypedEmitter from 'typed-emitter'
import { BlockchainTransaction, BlockchainTransactionType } from '../types/web3-types'
import { ethers } from 'ethers'
import { TownsClient } from './TownsClient'
import { isUserOpResponse } from '@towns/userops'

type Events = {
    updatedTransaction: (tx: BlockchainStoreTx) => void
    transactions: (args: Record<string, BlockchainStoreTx>) => void
}

export type BlockchainStoreTx = Partial<BlockchainTransaction> & {
    id: string
    status: 'potential' | 'pending' | 'success' | 'failure'
    error?: Error | undefined
}

export type BlockchainStoreTransactions = Record<string, BlockchainStoreTx>

export class BlockchainTransactionStore extends (EventEmitter as new () => TypedEmitter<Events>) {
    transactions: BlockchainStoreTransactions = {}
    spaceDapp: TownsClient['spaceDapp']
    promiseQueue: Promise<void>[] = []
    abortController = new AbortController()

    constructor(spaceDapp: TownsClient['spaceDapp']) {
        super()
        this.spaceDapp = spaceDapp
    }

    begin({ type, data }: Pick<BlockchainTransaction, 'type' | 'data'>) {
        const id = `STORE_ID__${ethers.Wallet.createRandom().address}`

        const tx: BlockchainStoreTx = {
            id,
            type,
            data,
            status: 'potential',
        }

        this.updateTransaction(tx)

        return ({
            hashOrUserOpHash,
            error,
            transaction,
            eventListener,
        }: {
            hashOrUserOpHash: BlockchainTransaction['hashOrUserOpHash'] | undefined
            transaction: BlockchainTransaction['transaction'] | undefined
            eventListener?: BlockchainTransaction['eventListener']
            error: Error | undefined
        }) => {
            if (hashOrUserOpHash && transaction) {
                this.moveToPending(id, {
                    hashOrUserOpHash,
                    transaction,
                    type,
                    data,
                    eventListener,
                })
                return
            }
            if (error) {
                if (this.transactions[id].status !== 'failure') {
                    this.updateTransaction({
                        ...tx,
                        status: 'failure',
                        error: error,
                    })
                }
            }
        }
    }

    async stop() {
        this.spaceDapp.provider?.removeAllListeners() // remove all pending txs
        this.abortController.abort()
        await Promise.all(this.promiseQueue)
        this.promiseQueue = []
        this.transactions = {}
    }

    private moveToPending(id: string, tx: BlockchainTransaction) {
        this.updateTransaction({
            ...tx,
            id,
            status: 'pending',
        })

        const _promise = new Promise<void>((resolve) => {
            const blockchainListener = async () => {
                this.abortController.signal.addEventListener('abort', () => {
                    return resolve()
                })

                const streamId = tx.data?.spaceStreamId
                const type = tx.type

                try {
                    const transactionOrUserOp = tx.transaction
                    let hashToWaitFor = tx.hashOrUserOpHash
                    // wait for event to be emitted
                    if (tx.eventListener) {
                        const result = await tx.eventListener.wait()

                        if (this.abortController.signal.aborted) {
                            return
                        }

                        this.updateTransaction({
                            ...tx,
                            id,
                            status: result.success ? 'success' : 'failure',
                        })
                        return
                    } else {
                        if (isUserOpResponse(transactionOrUserOp)) {
                            const userOpEvent = await transactionOrUserOp.wait()

                            if (this.abortController.signal.aborted) {
                                return
                            }

                            // TODO: parse user operation error
                            if (!userOpEvent || userOpEvent.args.success === false) {
                                this.updateTransaction({
                                    ...tx,
                                    id,
                                    status: 'failure',
                                })
                                return
                            }

                            hashToWaitFor = userOpEvent.transactionHash as `0x${string}`
                        }

                        // this should be the same wait time as townsClient.waitForTransaction
                        // only waiting for tx.wait() can resolve quicker than provider.waitForTransaction
                        await this.spaceDapp.provider?.waitForTransaction(hashToWaitFor)

                        if (this.abortController.signal.aborted) {
                            return
                        }

                        this.updateTransaction({
                            ...tx,
                            id,
                            status: 'success',
                        })
                    }
                } catch (error) {
                    const isWalletLink =
                        type === BlockchainTransactionType.LinkWallet ||
                        type === BlockchainTransactionType.UnlinkWallet

                    const parsedError = isWalletLink
                        ? this.spaceDapp.getWalletLink().parseError(error)
                        : await this.spaceDapp.parseSpaceError(streamId ?? '', error as Error)

                    this.updateTransaction({
                        ...tx,
                        id,
                        status: 'failure',
                        error: parsedError,
                    })
                } finally {
                    // Remove the promise from the queue after it resolves or is aborted
                    this.promiseQueue = this.promiseQueue.filter((p) => p !== _promise)
                    resolve()
                }
            }

            void blockchainListener()
        })

        this.promiseQueue.push(_promise)
    }

    private updateTransaction(tx: BlockchainStoreTx) {
        if (!this.transactions[tx.id]) {
            this.transactions = { ...this.transactions, [tx.id]: tx }
        }
        const { status, error } = tx
        const { [tx.id]: updateTX, ...rest } = this.transactions

        updateTX.status = status
        if (error) {
            updateTX.error = error
        }

        this.transactions = { ...rest, [tx.id]: updateTX }
        this.emit('updatedTransaction', updateTX)
        this.emit('transactions', this.transactions)
    }
}
