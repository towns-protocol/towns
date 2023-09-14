import {
    RoleTransactionContext,
    TransactionStatus,
    createRoleTransactionContext,
} from '../client/ZionClientTypes'
import { SignerUndefinedError, toError } from '../types/error-types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { BlockchainTransactionType } from '../types/web3-types'
import { blockchainKeys } from '../query/query-keys'
import { useQueryClient } from '../query/queryClient'
import { useTransactionStore } from '../store/use-transactions-store'
import { useWeb3Context } from '../components/Web3ContextProvider'
import { useZionClient } from './use-zion-client'
import { TokenEntitlementDataTypes, Permission } from '@river/web3'

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

    // create a new role
    const _createRoleTransaction = useCallback(
        async function (
            spaceNetworkId: string,
            roleName: string,
            permissions: Permission[],
            tokens: TokenEntitlementDataTypes.ExternalTokenStruct[],
            users: string[],
        ): Promise<RoleTransactionContext | undefined> {
            if (isTransacting.current) {
                console.warn('useCreateRoleTransaction', 'Transaction already in progress')
                return undefined
            }
            let transactionResult: RoleTransactionContext | undefined
            if (!signer) {
                transactionResult = createRoleTransactionContext({
                    status: TransactionStatus.Failed,
                    error: new SignerUndefinedError(),
                })
                setTransactionContext(transactionResult)
                return transactionResult
            }
            // ok to proceed
            isTransacting.current = true
            try {
                transactionResult = createRoleTransactionContext({
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
                    if (transactionResult.transaction?.hash) {
                        // todo: add necessary contextual data
                        useTransactionStore.getState().storeTransaction({
                            hash: transactionResult.transaction.hash as `0x${string}`,
                            type: BlockchainTransactionType.CreateRole,
                        })
                    }
                    // Wait for transaction to be mined
                    transactionResult = await waitForCreateRoleTransaction(transactionResult)
                    setTransactionContext(transactionResult)
                    if (transactionResult?.status === TransactionStatus.Success) {
                        await queryClient.invalidateQueries(blockchainKeys.roles(spaceNetworkId))
                    }
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (e: any) {
                console.error('useCreateRoleTransaction', e)
                transactionResult = createRoleTransactionContext({
                    status: TransactionStatus.Failed,
                    error: toError(e),
                })
                setTransactionContext(transactionResult)
            } finally {
                isTransacting.current = false
            }
            return transactionResult
        },
        [createRoleTransaction, queryClient, signer, waitForCreateRoleTransaction],
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
