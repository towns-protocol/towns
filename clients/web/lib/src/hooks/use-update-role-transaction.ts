import { SignerUndefinedError, toError } from '../types/error-types'
import {
    TransactionContext,
    TransactionStatus,
    createTransactionContext,
} from '../client/ZionClientTypes'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { BlockchainTransactionType } from '../types/web3-types'
import { Permission } from '../client/web3/ContractTypes'
import { QueryKeyRoles } from './query-keys'
import { createExternalTokenStruct } from '../client/web3/ContractHelpers'
import { useQueryClient } from '@tanstack/react-query'
import { useTransactionStore } from '../store/use-transactions-store'
import { useWeb3Context } from '../components/Web3ContextProvider'
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
    const { signer } = useWeb3Context()

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
            if (!signer) {
                setTransactionContext(
                    createTransactionContext(TransactionStatus.Failed, new SignerUndefinedError()),
                )
                return
            }
            // ok to proceed
            isTransacting.current = true
            try {
                const loading: TransactionContext<void> = createTransactionContext(
                    TransactionStatus.Pending,
                )
                setTransactionContext(loading)
                const txContext = await updateRoleTransaction(
                    spaceNetworkId,
                    roleId,
                    roleName,
                    permissions,
                    createExternalTokenStruct(tokens),
                    users,
                    signer,
                )
                setTransactionContext(txContext)
                if (txContext?.status === TransactionStatus.Pending) {
                    if (txContext.transaction?.hash) {
                        // todo: add necessary contextual data
                        useTransactionStore.getState().storeTransaction({
                            hash: txContext.transaction?.hash as `0x${string}`,
                            type: BlockchainTransactionType.UpdateRole,
                        })
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (e: any) {
                setTransactionContext(
                    createTransactionContext(TransactionStatus.Failed, toError(e)),
                )
            } finally {
                isTransacting.current = false
            }
        },
        [queryClient, signer, updateRoleTransaction, waitForUpdateRoleTransaction],
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
