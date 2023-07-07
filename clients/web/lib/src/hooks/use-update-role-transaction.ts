import {
    TransactionContext,
    TransactionStatus,
    createTransactionContext,
} from '../client/ZionClientTypes'
import { SignerUndefinedError, toError } from '../types/error-types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { BlockchainTransactionType } from '../types/web3-types'
import { Permission } from '../client/web3/ContractTypes'
import { blockchainKeys } from '../query/query-keys'
import { createExternalTokenStruct } from '../client/web3/ContractHelpers'
import { useQueryClient } from '../query/queryClient'
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
                    createExternalTokenStruct(tokens),
                    users,
                    signer,
                )
                setTransactionContext(transactionResult)
                if (transactionResult?.status === TransactionStatus.Pending) {
                    if (transactionResult.transaction?.hash) {
                        // todo: add necessary contextual data
                        useTransactionStore.getState().storeTransaction({
                            hash: transactionResult.transaction?.hash as `0x${string}`,
                            type: BlockchainTransactionType.UpdateRole,
                        })
                    }
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
