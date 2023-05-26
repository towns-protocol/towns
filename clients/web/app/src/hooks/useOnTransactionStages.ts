import { useEffect, useRef } from 'react'
import { TransactionStatus } from 'use-zion-client'

type Props = {
    transactionStatus: TransactionStatus
    transactionHash: string | undefined
    onSuccess?: () => void
    onCreate?: () => void
}

// combines transaction status and hash to trigger callbacks at various points in the blockchain transaction process
// TODO: Transaction.Failed is not currently needed, but can be added
export const useOnTransactionStages = ({
    transactionStatus,
    onSuccess,
    onCreate,
    transactionHash,
}: Props) => {
    const onSuccessRef = useRef(onSuccess)
    const onCreateRef = useRef(onCreate)

    onSuccessRef.current = onSuccess
    onCreateRef.current = onCreate

    useEffect(() => {
        console.log('[useOnTransactionStages]', transactionStatus, transactionHash)
        if (!transactionHash) {
            return
        }
        if (transactionStatus === TransactionStatus.Success) {
            onSuccessRef.current?.()
        } else if (transactionStatus === TransactionStatus.Pending) {
            onCreateRef.current?.()
        }
    }, [transactionStatus, transactionHash])
}
