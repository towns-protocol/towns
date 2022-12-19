import { useCallback, useMemo, useState } from 'react'

import { CreateChannelInfo } from '../types/matrix-types'
import { RoomIdentifier } from '../types/room-identifier'
import { TransactionContext, TransactionStatus } from '../client/ZionClientTypes'
import { useZionClient } from './use-zion-client'

/**
 * Combine Matrix channel creation and Smart Contract channel
 * creation into one hook.
 */
export function useCreateChannelTransaction() {
    const { createChannelTransaction, waitForCreateChannelTransaction } = useZionClient()
    const [transactionContext, setTransactionContext] = useState<
        TransactionContext<RoomIdentifier> | undefined
    >(undefined)

    const { data, isLoading, transactionHash, transactionStatus, error } = useMemo(() => {
        return {
            data: transactionContext?.data,
            isLoading: transactionContext?.status === TransactionStatus.Pending,
            transactionHash: transactionContext?.transaction?.hash,
            transactionStatus: transactionContext?.status ?? TransactionStatus.None,
            error: transactionContext?.error,
        }
    }, [transactionContext])

    const _createChannelTransaction = useCallback(
        async function (createInfo: CreateChannelInfo): Promise<void> {
            const loading: TransactionContext<RoomIdentifier> = {
                status: TransactionStatus.Pending,
                transaction: undefined,
                receipt: undefined,
                data: undefined,
            }
            setTransactionContext(loading)
            const txContext = await createChannelTransaction(createInfo)
            setTransactionContext(txContext)
            if (txContext?.status === TransactionStatus.Pending) {
                // No error and transaction is pending
                // Wait for transaction to be mined
                const rxContext = await waitForCreateChannelTransaction(txContext)
                setTransactionContext(rxContext)
            }
        },
        [createChannelTransaction, waitForCreateChannelTransaction],
    )

    console.log('useCreateChannelTransaction', 'states', {
        isLoading,
        data,
        error,
        transactionStatus,
        transactionHash,
    })

    return {
        isLoading,
        data,
        error,
        transactionHash,
        transactionStatus,
        createChannelTransaction: _createChannelTransaction,
    }
}
