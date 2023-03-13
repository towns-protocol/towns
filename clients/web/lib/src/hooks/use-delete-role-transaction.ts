import { TransactionContext, TransactionStatus } from '../client/ZionClientTypes'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { QueryKeyRoles } from './query-keys'
import { useQueryClient } from '@tanstack/react-query'
import { useZionClient } from './use-zion-client'
import { useTransactionStore } from '../store/use-transactions-store'
import { BlockchainTransactionType } from '../types/web3-types'

/**
 * Hook to create a role with a transaction.
 */
export function useDeleteRoleTransaction() {
    const [transactionContext, setTransactionContext] = useState<
        TransactionContext<void> | undefined
    >(undefined)
    const isTransacting = useRef<boolean>(false)
    const { deleteRoleTransaction, waitForDeleteRoleTransaction } = useZionClient()
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

    // update role with new permissions, tokens, and users
    const _deleteRoleTransaction = useCallback(
        async function (spaceNetworkId: string, roleId: number) {
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
                const txContext = await deleteRoleTransaction(spaceNetworkId, roleId)
                setTransactionContext(txContext)
                if (txContext?.status === TransactionStatus.Pending) {
                    if (txContext.transaction?.hash) {
                        // todo: add necessary contextual data
                        useTransactionStore.getState().storeTransaction({
                            hash: txContext.transaction?.hash as `0x${string}`,
                            type: BlockchainTransactionType.DeleteRole,
                        })
                    }
                    // Wait for transaction to be mined
                    const rxContext = await waitForDeleteRoleTransaction(txContext)
                    setTransactionContext(rxContext)
                    if (rxContext?.status === TransactionStatus.Success) {
                        await queryClient.invalidateQueries([
                            QueryKeyRoles.BySpaceId,
                            spaceNetworkId,
                        ])
                    }
                }
            } finally {
                isTransacting.current = false
            }
        },
        [deleteRoleTransaction, queryClient, waitForDeleteRoleTransaction],
    )

    useEffect(() => {
        console.log('useDeleteRoleTransaction', 'states', {
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
        deleteRoleTransaction: _deleteRoleTransaction,
    }
}
