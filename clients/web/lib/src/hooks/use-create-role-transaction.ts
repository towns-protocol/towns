import { TransactionContext, TransactionStatus } from '../client/ZionClientTypes'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createExternalTokenStruct } from '../client/web3/ContractHelpers'

import { Permission } from '../client/web3/ContractTypes'
import { QueryKeyRoles } from './query-keys'
import { RoleIdentifier } from '../types/web3-types'
import { useQueryClient } from '@tanstack/react-query'
import { useZionClient } from './use-zion-client'

/**
 * Hook to create a role with a transaction.
 */
export function useCreateRoleTransaction() {
    const [transactionContext, setTransactionContext] = useState<
        TransactionContext<RoleIdentifier> | undefined
    >(undefined)
    const isTransacting = useRef<boolean>(false)
    const { createRoleTransaction, waitForCreateRoleTransaction } = useZionClient()
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

    // create a new role
    const _createRoleTransaction = useCallback(
        async function (
            spaceNetworkId: string,
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
                const loading: TransactionContext<RoleIdentifier> = {
                    status: TransactionStatus.Pending,
                    transaction: undefined,
                    receipt: undefined,
                    data: undefined,
                }
                setTransactionContext(loading)
                const txContext = await createRoleTransaction(
                    spaceNetworkId,
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
                    const rxContext = await waitForCreateRoleTransaction(txContext)
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
        [createRoleTransaction, queryClient, waitForCreateRoleTransaction],
    )

    useEffect(() => {
        console.log('useCreateRoleTransaction', 'states', {
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
        createRoleTransaction: _createRoleTransaction,
    }
}
