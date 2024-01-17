import {
    TransactionContext,
    TransactionStatus,
    createTransactionContext,
} from '../client/ZionClientTypes'
import { SignerUndefinedError, toError } from '../types/error-types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { TSigner } from '../types/web3-types'
import { blockchainKeys } from '../query/query-keys'
import { useQueryClient } from '../query/queryClient'
import { useZionClient } from './use-zion-client'
import { TokenEntitlementDataTypes, Permission } from '@river/web3'
import { getTransactionHashOrUserOpHash } from '@towns/userops'

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
            transactionHash: getTransactionHashOrUserOpHash(transactionContext?.transaction),
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
            tokens: TokenEntitlementDataTypes.ExternalTokenStruct[],
            users: string[],
            signer: TSigner,
        ): Promise<TransactionContext<void> | undefined> {
            if (isTransacting.current) {
                console.warn('useUpdateRoleTransaction', 'Transaction already in progress')
                return undefined
            }
            let transactionResult: TransactionContext<void> | undefined
            if (!signer) {
                console.error('useUpdateRoleTransaction', 'Signer is undefined')
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
                transactionResult = await updateRoleTransaction(
                    spaceNetworkId,
                    roleId,
                    roleName,
                    permissions,
                    tokens,
                    users,
                    signer,
                )
                setTransactionContext(transactionResult)
                if (transactionResult?.status === TransactionStatus.Pending) {
                    // Wait for transaction to be mined
                    transactionResult = await waitForUpdateRoleTransaction(transactionResult)
                    setTransactionContext(transactionResult)
                    if (transactionResult?.status === TransactionStatus.Success) {
                        await queryClient.invalidateQueries(
                            blockchainKeys.roleDetails(spaceNetworkId, roleId),
                        )
                    }
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (e: any) {
                console.error('useUpdateRoleTransaction', 'Transaction failed', e)
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
