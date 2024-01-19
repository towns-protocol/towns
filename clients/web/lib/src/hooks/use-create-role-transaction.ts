import {
    RoleTransactionContext,
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
export function useCreateRoleTransaction() {
    const [transactionContext, setTransactionContext] = useState<
        RoleTransactionContext | undefined
    >(undefined)
    const isTransacting = useRef<boolean>(false)
    const { createRoleTransaction, waitForCreateRoleTransaction } = useZionClient()
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

    // create a new role
    const _createRoleTransaction = useCallback(
        async function (
            spaceNetworkId: string,
            roleName: string,
            permissions: Permission[],
            tokens: TokenEntitlementDataTypes.ExternalTokenStruct[],
            users: string[],
            signer: TSigner,
        ): Promise<RoleTransactionContext | undefined> {
            if (isTransacting.current) {
                console.warn('useCreateRoleTransaction', 'Transaction already in progress')
                return undefined
            }

            let transactionResult: RoleTransactionContext | undefined
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
                transactionResult = await createRoleTransaction(
                    spaceNetworkId,
                    roleName,
                    permissions,
                    tokens,
                    users,
                    signer,
                )
                setTransactionContext(transactionResult)
                if (transactionResult?.status === TransactionStatus.Pending) {
                    // Wait for transaction to be mined
                    transactionResult = await waitForCreateRoleTransaction(transactionResult)
                    setTransactionContext(transactionResult)
                    if (transactionResult?.status === TransactionStatus.Success) {
                        await queryClient.invalidateQueries({
                            queryKey: blockchainKeys.roles(spaceNetworkId),
                        })
                    }
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (e: any) {
                console.error('useCreateRoleTransaction', e)
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
