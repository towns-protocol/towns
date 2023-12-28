import {
    TransactionContext,
    TransactionStatus,
    createTransactionContext,
} from '../client/ZionClientTypes'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { TSigner } from '../types/web3-types'
import { blockchainKeys } from '../query/query-keys'
import { SignerUndefinedError, toError } from '../types/error-types'
import { useQueryClient } from '../query/queryClient'
import { useZionClient } from './use-zion-client'

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
        async function (
            spaceNetworkId: string,
            roleId: number,
            signer: TSigner,
        ): Promise<TransactionContext<void> | undefined> {
            if (isTransacting.current) {
                console.warn('deleteRoleTransaction', 'transaction already in progress')
                return undefined
            }
            let transactionResult: TransactionContext<void> | undefined
            if (!signer) {
                transactionResult = createTransactionContext({
                    status: TransactionStatus.Failed,
                    error: new SignerUndefinedError(),
                })
                setTransactionContext(transactionResult)
                return transactionResult
            }
            // ok to proceed
            isTransacting.current = true
            try {
                transactionResult = createTransactionContext({
                    status: TransactionStatus.Pending,
                })
                setTransactionContext(transactionResult)
                transactionResult = await deleteRoleTransaction(spaceNetworkId, roleId, signer)
                setTransactionContext(transactionResult)
                if (transactionResult?.status === TransactionStatus.Pending) {
                    // Wait for transaction to be mined
                    transactionResult = await waitForDeleteRoleTransaction(transactionResult)
                    setTransactionContext(transactionResult)
                    if (transactionResult?.status === TransactionStatus.Success) {
                        await queryClient.invalidateQueries(blockchainKeys.roles(spaceNetworkId))
                    }
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (e: any) {
                console.error('deleteRoleTransaction', e)
                transactionResult = createTransactionContext({
                    status: TransactionStatus.Failed,
                    error: toError(e),
                })
                setTransactionContext(transactionResult)
            } finally {
                isTransacting.current = false
            }
            return transactionResult
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
