import { useMemo } from 'react'
import { TransactionStatus } from 'use-zion-client'

export type TransactionUIStatesType = {
    isTransacting: boolean
    isRequesting: boolean
    isSuccess: boolean
    isFailed: boolean
    isAbleToInteract: boolean
}

export const useTransactionUIStates = (
    transactionStatus: TransactionStatus,
    hasData: boolean,
): TransactionUIStatesType => {
    const { isAbleToInteract, isRequesting, isSuccess, isFailed, isTransacting } = useMemo(() => {
        const isTransacting = transactionStatus !== TransactionStatus.None
        const failed = transactionStatus === TransactionStatus.Failed
        return {
            isTransacting: transactionStatus !== TransactionStatus.None,
            isRequesting: transactionStatus === TransactionStatus.Pending && !hasData,
            isSuccess: transactionStatus === TransactionStatus.Success,
            isFailed: failed,
            isAbleToInteract: !isTransacting || failed,
        }
    }, [transactionStatus, hasData])

    return { isAbleToInteract, isRequesting, isSuccess, isFailed, isTransacting }
}
