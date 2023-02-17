import { ChannelUpdateTransactionContext, TransactionStatus } from '../client/ZionClientTypes'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { UpdateChannelInfo } from 'types/zion-types'
import { useZionClient } from './use-zion-client'

/**
 * Hook to create a role with a transaction.
 */
export function useUpdateChannelTransaction() {
    const [transactionContext, setTransactionContext] = useState<
        ChannelUpdateTransactionContext | undefined
    >(undefined)
    const isTransacting = useRef<boolean>(false)
    const { updateChannelTransaction, waitForUpdateChannelTransaction } = useZionClient()
    const { data, isLoading, transactionHash, transactionStatus, error } = useMemo(() => {
        return {
            data: transactionContext?.data,
            isLoading: transactionContext?.status === TransactionStatus.Pending,
            transactionHash: transactionContext?.transaction?.hash,
            transactionStatus: transactionContext?.status ?? TransactionStatus.None,
            error: transactionContext?.error,
        }
    }, [transactionContext])

    // update role with new permissions, tokens, and users
    const _updateChannelTransaction = useCallback(
        async function (updateChannelInfo: UpdateChannelInfo) {
            if (isTransacting.current) {
                // Transaction already in progress
                return
            }

            isTransacting.current = true
            try {
                const loading: ChannelUpdateTransactionContext = {
                    status: TransactionStatus.Pending,
                    transaction: undefined,
                    receipt: undefined,
                    data: undefined,
                }
                setTransactionContext(loading)
                const txContext = await updateChannelTransaction(updateChannelInfo)
                setTransactionContext(txContext)
                if (txContext?.status === TransactionStatus.Pending) {
                    if (txContext.transaction && txContext.data) {
                        // todo: add to the transaction store
                    }
                    // Wait for transaction to be mined
                    const rxContext = await waitForUpdateChannelTransaction(txContext)
                    setTransactionContext(rxContext)
                }
            } finally {
                isTransacting.current = false
            }
        },
        [updateChannelTransaction, waitForUpdateChannelTransaction],
    )

    useEffect(() => {
        console.log('useUpdateChannelTransaction', 'states', {
            isLoading,
            data,
            error,
            transactionStatus,
            transactionHash,
        })
    }, [data, error, isLoading, transactionHash, transactionStatus])

    return {
        isLoading,
        data,
        error,
        transactionHash,
        transactionStatus,
        updateChannelTransaction: _updateChannelTransaction,
    }
}
