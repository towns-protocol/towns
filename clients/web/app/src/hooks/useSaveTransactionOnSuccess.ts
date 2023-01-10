import { useEffect } from 'react'
import { TransactionStatus } from 'use-zion-client'
import { StoredTransactionType, useTransactionStore } from 'store/transactionsStore'

type UseSaveTransactionProps<T> = {
    hash: string | undefined
    status: TransactionStatus
    type: StoredTransactionType
    data: T
}

export const useSaveTransactionOnCreation = <T extends string | undefined>({
    hash,
    status,
    type,
    data,
}: UseSaveTransactionProps<T>) => {
    const storeTransaction = useTransactionStore((state) => state.storeTransaction)

    useEffect(() => {
        if (hash && status === TransactionStatus.Pending) {
            storeTransaction({
                hash,
                data,
                type,
            })
        }
    }, [data, hash, status, storeTransaction, type])
}
