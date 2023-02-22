import { TransactionContext, TransactionStatus } from '../client/ZionClientTypes'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { QueryKeyRoles } from './query-keys'
import { useQueryClient } from '@tanstack/react-query'
import { useZionClient } from './use-zion-client'

/**
 * Hook to add a role to a channel with a transaction.
 */
export function useAddRoleToChannelTransaction() {
    const [transactionContext, setTransactionContext] = useState<
        TransactionContext<void> | undefined
    >(undefined)
    const isTransacting = useRef<boolean>(false)
    const { addRoleToChannelTransaction, waitForAddRoleToChannelTransaction } = useZionClient()
    const queryClient = useQueryClient()

    const { data, isLoading, transactionHash, transactionStatus, error } = useMemo(() => {
        return {
            data: transactionContext?.data,
            isLoading: transactionContext?.status === TransactionStatus.Pending,
            transactionHash: transactionContext?.transaction?.hash,
            transactionStatus: transactionContext?.status ?? TransactionStatus.None,
            error: transactionContext?.error,
        }
    }, [transactionContext])

    const _addRoleToChannelTransaction = useCallback(
        async function (spaceNetworkId: string, channelNetworkId: string, roleId: number) {
            if (isTransacting.current) {
                // Transaction already in progress
                return
            }

            isTransacting.current = true
            try {
                const loading: TransactionContext<void> = {
                    status: TransactionStatus.Pending,
                    transaction: undefined,
                    receipt: undefined,
                    data: undefined,
                }
                setTransactionContext(loading)
                const txContext = await addRoleToChannelTransaction(
                    spaceNetworkId,
                    channelNetworkId,
                    roleId,
                )
                setTransactionContext(txContext)
                if (txContext?.status === TransactionStatus.Pending) {
                    if (txContext.transaction && txContext.data) {
                        // todo: add to the transaction store
                    }
                    // Wait for transaction to be mined
                    const rxContext = await waitForAddRoleToChannelTransaction(txContext)
                    setTransactionContext(rxContext)
                    if (rxContext?.status === TransactionStatus.Success) {
                        await queryClient.invalidateQueries([
                            QueryKeyRoles.BySpaceId,
                            spaceNetworkId,
                            QueryKeyRoles.ByRoleId,
                            roleId,
                            QueryKeyRoles.ByChannelId,
                            channelNetworkId,
                        ])
                    }
                }
            } finally {
                isTransacting.current = false
            }
        },
        [queryClient, addRoleToChannelTransaction, waitForAddRoleToChannelTransaction],
    )

    useEffect(() => {
        console.log('useAddRoleToChannelTransaction', 'states', {
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
        addRoleToChannelTransaction: _addRoleToChannelTransaction,
    }
}
