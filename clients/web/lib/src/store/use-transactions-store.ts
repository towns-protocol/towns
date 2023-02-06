import create from 'zustand'
import { persist } from 'zustand/middleware'
import EventEmitter from 'events'
import { useEffect } from 'react'
import { BlockchainTransaction } from '../types/web3-types'

export type EmittedTransaction = BlockchainTransaction & {
    isSuccess: boolean
}

interface TransactionsState {
    transactions: {
        [hash: string]: BlockchainTransaction
    }
    storeTransaction: (transaction: BlockchainTransaction) => void
    deleteAndEmitTransaction: (hash: string, isSuccess: boolean) => void
}

export const useTransactionStore = create(
    persist<TransactionsState>(
        (set, get) => ({
            transactions: {},
            storeTransaction: (transaction) =>
                set((state) => {
                    return {
                        transactions: {
                            ...state.transactions,
                            [transaction.hash]: get().transactions[transaction.hash] ?? transaction,
                        },
                    }
                }),
            deleteAndEmitTransaction: (hash, isSuccess) =>
                set((state) => {
                    const transactions = { ...state.transactions }
                    const { [hash]: toEmit, ...rest } = transactions
                    TxnsEventEmitter.emitTransaction({ ...toEmit, isSuccess })
                    return { ...state, transactions: rest }
                }),
        }),
        {
            name: 'zion/transactions',
        },
    ),
)

const eventEmitter = new EventEmitter()

export const TxnsEventEmitter = Object.freeze({
    on: (fn: (args: EmittedTransaction) => void) => eventEmitter.on('transaction', fn),
    off: (fn: (args: EmittedTransaction) => void) => eventEmitter.off('transaction', fn),
    emitTransaction: (payload: EmittedTransaction) => eventEmitter.emit('transaction', payload),
})

export const useOnTransactionEmitted = (callback: (args: EmittedTransaction) => void) => {
    useEffect(() => {
        TxnsEventEmitter.on(callback)
        return () => {
            TxnsEventEmitter.off(callback)
        }
    }, [callback])
}
