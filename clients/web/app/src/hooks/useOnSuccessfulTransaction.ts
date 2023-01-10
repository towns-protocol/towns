import { useEffect } from 'react'
import { TransactionStatus } from 'use-zion-client'

type UseOnSuccessfulTransactionProps = {
    status: TransactionStatus
    callback: () => void
}

export const useOnSuccessfulTransaction = ({
    status,
    callback,
}: UseOnSuccessfulTransactionProps) => {
    useEffect(() => {
        if (status === TransactionStatus.Success) {
            callback()
        }
    }, [callback, status])
}
