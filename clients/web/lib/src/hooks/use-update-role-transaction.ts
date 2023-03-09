import { TransactionContext, TransactionStatus } from '../client/ZionClientTypes'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createExternalTokenStruct } from '../client/web3/ContractHelpers'

import { Permission } from '../client/web3/ContractTypes'
import { QueryKeyRoles } from './query-keys'
import { useQueryClient } from '@tanstack/react-query'
import { useZionClient } from './use-zion-client'

/**
 * Hook to create a role with a transaction.
 */
export function useUpdateRoleTransaction() {
    const [transactionContext, setTransactionContext] = useState<
        TransactionContext<void> | undefined
    >(undefined)
    const isTransacting = useRef<boolean>(false)
    const { updateRoleTransaction, waitForUpdateRoleTransaction } = useZionClient()
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
    const _updateRoleTransaction = useCallback(
        async function (
            spaceNetworkId: string,
            roleId: number,
            roleName: string,
            permissions: Permission[],
            tokens: string[],
            users: string[],
        ) {
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
                const txContext = await updateRoleTransaction(
                    spaceNetworkId,
                    roleId,
                    roleName,
                    permissions,
                    createExternalTokenStruct(tokens),
                    users,
                )
                setTransactionContext(txContext)
                if (txContext?.status === TransactionStatus.Pending) {
                    if (txContext.transaction && txContext.data) {
                        // todo: add to the transaction store
                    }
                    // Wait for transaction to be mined
                    const rxContext = await waitForUpdateRoleTransaction(txContext)
                    setTransactionContext(rxContext)
                    if (rxContext?.status === TransactionStatus.Success) {
                        await queryClient.invalidateQueries([
                            QueryKeyRoles.BySpaceId,
                            spaceNetworkId,
                            QueryKeyRoles.ByRoleId,
                            roleId,
                        ])
                    }
                }
            } finally {
                isTransacting.current = false
            }
        },
        [queryClient, updateRoleTransaction, waitForUpdateRoleTransaction],
    )

    useEffect(() => {
        console.log('useUpdateRoleTransaction', 'states', {
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
        updateRoleTransaction: _updateRoleTransaction,
    }
}
