import {
    TransactionContext,
    TransactionStatus,
    createTransactionContext,
} from '../client/TownsClientTypes'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { SignerUndefinedError, toError } from '../types/error-types'
import { useTownsClient } from './use-towns-client'
import { getTransactionHashOrUserOpHash } from '@towns/userops'
import { queryClient } from '../query/queryClient'
import { blockchainKeys } from '../query/query-keys'

export function useEditSpaceMembershipTransaction() {
    const [transactionContext, setTransactionContext] = useState<
        TransactionContext<void> | undefined
    >(undefined)
    const isTransacting = useRef<boolean>(false)
    const { editSpaceMembershipTransaction, waitForEditSpaceMembershipTransaction } =
        useTownsClient()

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
    const _editSpaceMembershipTransaction = useCallback(
        async function (
            args: Parameters<typeof editSpaceMembershipTransaction>[0],
        ): Promise<TransactionContext<void> | undefined> {
            const { spaceId, updateRoleParams, signer, membershipParams } = args

            if (isTransacting.current) {
                console.warn('editSpaceMembershipTransaction', 'transaction already in progress')
                return undefined
            }
            // ok to proceed
            isTransacting.current = true
            let transactionResult: TransactionContext<void> | undefined
            if (!signer) {
                transactionResult = createTransactionContext({
                    status: TransactionStatus.Failed,
                    error: new SignerUndefinedError(),
                })
                setTransactionContext(transactionResult)
                return transactionResult
            }

            try {
                transactionResult = createTransactionContext({
                    status: TransactionStatus.Pending,
                })
                setTransactionContext(transactionResult)
                transactionResult = await editSpaceMembershipTransaction({
                    spaceId,
                    updateRoleParams,
                    signer,
                    membershipParams,
                })
                setTransactionContext(transactionResult)
                if (transactionResult?.status === TransactionStatus.Pending) {
                    // Wait for transaction to be mined
                    transactionResult = await waitForEditSpaceMembershipTransaction(
                        transactionResult,
                    )
                    setTransactionContext(transactionResult)
                    if (transactionResult?.status === TransactionStatus.Success) {
                        // invalidate minter role details
                        void queryClient.invalidateQueries({
                            queryKey: blockchainKeys.roleDetails(spaceId, 1),
                        })
                        void queryClient.invalidateQueries({
                            queryKey: blockchainKeys.membershipInfo(spaceId),
                        })
                    }
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (e: any) {
                console.error('editSpaceRoleTransaaction', e)
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
        [editSpaceMembershipTransaction, waitForEditSpaceMembershipTransaction],
    )

    useEffect(() => {
        console.log('useEditSpaceMembership', 'states', {
            isLoading,
            data,
            error,
            transactionStatus,
            transactionHash,
        })
    }, [data, error, isLoading, transactionHash, transactionStatus])

    return useMemo(
        () => ({
            isLoading,
            data,
            error,
            transactionHash,
            transactionStatus,
            editSpaceMembershipTransaction: _editSpaceMembershipTransaction,
        }),
        [
            _editSpaceMembershipTransaction,
            data,
            error,
            isLoading,
            transactionHash,
            transactionStatus,
        ],
    )
}
