import { useCallback, useEffect, useMemo, useState } from 'react'

import { CreateChannelInfo } from '../types/matrix-types'
import { RoomIdentifier } from '../types/room-identifier'
import { TransactionContext, TransactionStatus } from '../client/ZionClientTypes'
import { useZionClient } from './use-zion-client'
import { StoredTransactionType, useTransactionStore } from '../store/use-transactions-store'

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
                // save it to local storage so we can track it
                if (txContext.transaction && txContext.data) {
                    useTransactionStore.getState().storeTransaction({
                        hash: txContext.transaction?.hash as `0x${string}`,
                        type: StoredTransactionType.CreateChannel,
                        data: {
                            parentSpaceId: txContext.parentSpaceId,
                            spaceId: txContext.data,
                        },
                    })
                }
                // Wait for transaction to be mined
                const rxContext = await waitForCreateChannelTransaction(txContext)
                setTransactionContext(rxContext)
            }
        },
        [createChannelTransaction, waitForCreateChannelTransaction],
    )

    useEffect(() => {
        console.log('useCreateChannelTransaction', 'states', {
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
        createChannelTransaction: _createChannelTransaction,
    }
}
