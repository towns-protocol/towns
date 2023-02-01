import { RoomIdentifier } from 'types/room-identifier'
import { Address } from 'wagmi'
import create from 'zustand'
import { persist } from 'zustand/middleware'
import EventEmitter from 'events'
import { useEffect } from 'react'

export enum StoredTransactionType {
    CreateSpace = 'createSpace',
    CreateChannel = 'createChannel',
}

export type StoredTransaction = {
    hash: Address
    data?: {
        parentSpaceId?: string
        spaceId: RoomIdentifier
    }
    type: StoredTransactionType
}

export type EmittedTransaction = StoredTransaction & {
    isSuccess: boolean
}

interface TransactionsState {
    transactions: {
        [hash: string]: StoredTransaction
    }
    storeTransaction: (transaction: StoredTransaction) => void
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
