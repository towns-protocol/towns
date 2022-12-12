import { useMemo } from 'react'
import { TransactionStatus } from 'use-zion-client'

export const TransactionUIStates = {
    ...TransactionStatus,
    Requesting: 'Requesting',
}

export type TransactionUIStatesType = keyof typeof TransactionUIStates

export const useTransactionUIStates = (
    transactionStatus: TransactionStatus,
    hasData: boolean,
): TransactionUIStatesType => {
    const state = useMemo(() => {
        console.log({ transactionStatus, hasData })
        if (transactionStatus === TransactionStatus.Pending && !hasData) {
            return TransactionUIStates.Requesting as TransactionStatus
        }

        return transactionStatus
    }, [transactionStatus, hasData])

    return state
}
