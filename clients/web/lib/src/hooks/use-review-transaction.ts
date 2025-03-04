import {
    createTransactionContext,
    TransactionStatus,
    TownsReviewParams,
    ReviewTransactionContext,
    ReviewTransactionData,
} from '../client/TownsClientTypes'
import { queryClient } from '../query/queryClient'
import { blockchainKeys } from '../query/query-keys'
import { SignerUndefinedError, toError } from '../types/error-types'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useTownsClient } from './use-towns-client'
import { getTransactionHashOrUserOpHash } from '@towns/userops'

/**
 * Hook to handle review transactions.
 */
export function useReviewTransaction() {
    const [transactionContext, setTransactionContext] = useState<
        ReviewTransactionContext | undefined
    >()
    const isTransacting = useRef<boolean>(false)
    const { reviewTransaction, waitForReviewTransaction } = useTownsClient()

    const { data, isLoading, transactionHash, transactionStatus, error } = useMemo(
        () => ({
            data: transactionContext?.data,
            isLoading: transactionContext?.status === TransactionStatus.Pending,
            transactionHash: getTransactionHashOrUserOpHash(transactionContext?.transaction),
            transactionStatus: transactionContext?.status ?? TransactionStatus.None,
            error: transactionContext?.error,
        }),
        [transactionContext],
    )

    const _review = useCallback(
        async function (
            args: TownsReviewParams,
            {
                onSuccess,
                onError,
            }: {
                onSuccess?: () => void
                onError?: (error: Error) => void
            } = {},
        ): Promise<ReviewTransactionContext | undefined> {
            if (isTransacting.current) {
                console.warn('useReviewTransaction', 'Transaction already in progress')
                return undefined
            }

            isTransacting.current = true
            const transactionData: ReviewTransactionData = {
                ...args,
                isUpdate: Boolean(args.isUpdate),
                isDelete: Boolean(args.isDelete),
            }

            try {
                if (!args.signer) {
                    const result = createTransactionContext<ReviewTransactionData>({
                        status: TransactionStatus.Failed,
                        error: new SignerUndefinedError(),
                        data: transactionData,
                    })
                    setTransactionContext(result)
                    return result
                }

                // Start with pending status
                setTransactionContext(
                    createTransactionContext<ReviewTransactionData>({
                        status: TransactionStatus.Pending,
                        data: transactionData,
                    }),
                )

                // Submit the review transaction
                const txContext = await reviewTransaction([args, args.signer])

                if (!txContext?.transaction) {
                    throw new Error('Failed to create review transaction')
                }

                // Update context with transaction
                setTransactionContext(
                    createTransactionContext<ReviewTransactionData>({
                        status: TransactionStatus.Pending,
                        transaction: txContext.transaction,
                        data: transactionData,
                    }),
                )

                // Wait for transaction to complete
                const result = await waitForReviewTransaction(txContext)
                if (!result) {
                    throw new Error('Failed to wait for review transaction')
                }

                if (result.status === TransactionStatus.Failed) {
                    throw result.error || new Error('Transaction failed')
                }

                // Update with final result
                const finalContext = createTransactionContext<ReviewTransactionData>({
                    status: result.status,
                    transaction: result.transaction,
                    receipt: result.receipt,
                    error: result.error,
                    data: transactionData,
                })
                setTransactionContext(finalContext)

                if (finalContext.status === TransactionStatus.Success) {
                    onSuccess?.()
                    await queryClient.invalidateQueries({
                        queryKey: blockchainKeys.spaceReviews(args.spaceId),
                    })
                }

                return finalContext
            } catch (e) {
                console.error('useReviewTransaction error:', e)
                const error = toError(e)

                const errorContext = createTransactionContext<ReviewTransactionData>({
                    status: TransactionStatus.Failed,
                    error,
                    data: transactionData,
                })
                setTransactionContext(errorContext)
                onError?.(error)
                return errorContext
            } finally {
                isTransacting.current = false
            }
        },
        [reviewTransaction, waitForReviewTransaction],
    )

    return {
        isLoading,
        data,
        error,
        transactionHash,
        transactionStatus,
        review: _review,
    }
}
