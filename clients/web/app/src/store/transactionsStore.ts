import create from 'zustand'
import { persist } from 'zustand/middleware'

export enum StoredTransactionType {
    CreateSpace = 'createSpace',
    CreateChannel = 'createChannel',
}

type StoredTransaction = {
    hash: string
    data?: string
    type: StoredTransactionType
}

interface TransactionsState {
    transactions: {
        [hash: string]: StoredTransaction
    }
    storeTransaction: (transaction: StoredTransaction) => void
    deleteTransaction: (hash: string) => void
}

export const useTransactionStore = create(
    persist<TransactionsState>(
        (set, get) => ({
            transactions: {},
            storeTransaction: (transaction: StoredTransaction) =>
                set((state) => {
                    return {
                        transactions: {
                            ...state.transactions,
                            [transaction.hash]: get().transactions[transaction.hash] ?? transaction,
                        },
                    }
                }),
            deleteTransaction: (hash: string) =>
                set((state) => {
                    const transactions = { ...state.transactions }
                    delete transactions[hash]
                    return { transactions }
                }),
        }),
        {
            name: 'zion/transactions',
        },
    ),
)
