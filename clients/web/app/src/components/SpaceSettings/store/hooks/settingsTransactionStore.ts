import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { ModifiedRole } from './useModifiedRoles'

export type SettingsTransactionStatus = {
    changeData: ModifiedRole
    hash?: string
    error?: Error
    status: 'potential' | 'pending' | 'failed' | 'success'
}

type State = {
    inProgressTransactions: Record<string, SettingsTransactionStatus>
    settledTransactions: Record<string, SettingsTransactionStatus>
}

type Actions = {
    setPendingTransaction: (roleId: string, hash: string) => void
    setTransactionFailed: (roleId: string, error: Error) => void
    setTransactionSuccess: (roleId: string) => void
    getTransaction: (changeData: ModifiedRole) => SettingsTransactionStatus | undefined
    setPotentialTransaction: (changeData: ModifiedRole) => void
    removePotentialTransaction: (roleId: string) => void
    clearSettled: () => void
    saveToSettledAndClearInProgress: () => void
}

// Manages the state of the submitted transactions for the space
export const useSettingsTransactionsStore = create(
    immer<State & Actions>((set, get) => ({
        inProgressTransactions: {},
        settledTransactions: {},
        setPendingTransaction: (roleId: string, hash: string) => {
            set((state) => {
                const transaction = state.inProgressTransactions[roleId]
                if (!transaction) {
                    return
                }
                transaction.status = 'pending'
                transaction.hash = hash
            })
        },
        removePotentialTransaction: (roleId: string) => {
            set((state) => {
                delete state.inProgressTransactions[roleId]
            })
        },
        setPotentialTransaction(changeData: ModifiedRole) {
            set((state) => {
                if (state.inProgressTransactions[changeData.metadata.id]) {
                    return
                }
                state.inProgressTransactions[changeData.metadata.id] = {
                    changeData,
                    status: 'potential',
                }
            })
        },
        setTransactionFailed(roleId: string, error: Error) {
            set((state) => {
                const transaction = state.inProgressTransactions[roleId]
                if (!transaction) {
                    return
                }

                transaction.status = 'failed'
                transaction.error = error
            })
        },
        setTransactionSuccess(roleId: string) {
            set((state) => {
                const transaction = state.inProgressTransactions[roleId]
                if (!transaction) {
                    return
                }
                transaction.status = 'success'
            })
        },
        getTransaction(changeData) {
            return get().inProgressTransactions[changeData.metadata.id]
        },
        saveToSettledAndClearInProgress() {
            set((state) => {
                state.settledTransactions = state.inProgressTransactions
                state.inProgressTransactions = {}
            })
        },
        clearSettled() {
            set((state) => {
                state.settledTransactions = {}
            })
        },
    })),
)
