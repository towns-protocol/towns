import {
    createTransactionContext,
    TransactionStatus,
    TransactionContext,
} from '../client/TownsClientTypes'
import { queryClient } from '../query/queryClient'
import { blockchainKeys } from '../query/query-keys'
import { SignerUndefinedError, toError } from '../types/error-types'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useTownsClient } from './use-towns-client'
import { getTransactionHashOrUserOpHash } from '@towns/userops'
import { Signer } from 'ethers'

interface ReviewParams {
    spaceId: string
    rating: number
    comment: string
    isUpdate?: boolean
    isDelete?: boolean
    signer: Signer
}

interface ReviewTransactionData {
    spaceId: string
    rating: number
    comment: string
    isUpdate: boolean
    isDelete: boolean
}

type ReviewTransactionContext = TransactionContext<ReviewTransactionData>

/**
 * Hook to handle review transactions.
 */
export function useReviewTransaction() {
    const [transactionContext, setTransactionContext] = useState<
        ReviewTransactionContext | undefined
    >(undefined)
    const isTransacting = useRef<boolean>(false)
    const { reviewTransaction, waitForReviewTransaction } = useTownsClient()

    const { data, isLoading, transactionHash, transactionStatus, error } = useMemo(() => {
        return {
            data: transactionContext?.data,
            isLoading: transactionContext?.status === TransactionStatus.Pending,
            transactionHash: getTransactionHashOrUserOpHash(transactionContext?.transaction),
            transactionStatus: transactionContext?.status ?? TransactionStatus.None,
            error: transactionContext?.error,
        }
    }, [transactionContext])

    const _review = useCallback(
        async function (
            args: ReviewParams,
            {
                onSuccess,
                onError,
            }: {
                onSuccess?: () => void
                onError?: (error: Error) => void
            } = {},
        ): Promise<ReviewTransactionContext | undefined> {
            const { signer, spaceId, rating, comment, isUpdate, isDelete } = args
            if (isTransacting.current) {
                console.warn('useReviewTransaction', 'Transaction already in progress')
                return undefined
            }

            isTransacting.current = true
            let transactionResult: ReviewTransactionContext | undefined

            try {
                if (!signer) {
                    transactionResult = createTransactionContext<ReviewTransactionData>({
                        status: TransactionStatus.Failed,
                        error: new SignerUndefinedError(),
                        data: {
                            spaceId,
                            rating,
                            comment,
                            isUpdate: !!isUpdate,
                            isDelete: !!isDelete,
                        },
                    })
                    setTransactionContext(transactionResult)
                    return transactionResult
                }

                // Start with pending status
                transactionResult = createTransactionContext<ReviewTransactionData>({
                    status: TransactionStatus.Pending,
                    data: {
                        spaceId,
                        rating,
                        comment,
                        isUpdate: !!isUpdate,
                        isDelete: !!isDelete,
                    },
                })
                setTransactionContext(transactionResult)

                // Submit the review transaction
                const txContext = await reviewTransaction([
                    {
                        spaceId,
                        rating,
                        comment,
                        isUpdate,
                        isDelete,
                        signer,
                    },
                    signer,
                ])

                if (!txContext?.transaction) {
                    throw new Error('Failed to create review transaction')
                }

                // Update context with transaction
                transactionResult = createTransactionContext<ReviewTransactionData>({
                    status: TransactionStatus.Pending,
                    transaction: txContext.transaction,
                    data: {
                        spaceId,
                        rating,
                        comment,
                        isUpdate: !!isUpdate,
                        isDelete: !!isDelete,
                    },
                })
                setTransactionContext(transactionResult)

                // Wait for transaction to complete
                const result = await waitForReviewTransaction(txContext)
                if (!result) {
                    throw new Error('Failed to wait for review transaction')
                }

                if (result.status === TransactionStatus.Failed) {
                    throw result.error || new Error('Transaction failed')
                }

                // Update with final result
                transactionResult = createTransactionContext<ReviewTransactionData>({
                    status: result.status,
                    transaction: result.transaction,
                    receipt: result.receipt,
                    error: result.error,
                    data: {
                        spaceId,
                        rating,
                        comment,
                        isUpdate: !!isUpdate,
                        isDelete: !!isDelete,
                    },
                })
                setTransactionContext(transactionResult)

                if (transactionResult.status === TransactionStatus.Success) {
                    onSuccess?.()
                    await queryClient.invalidateQueries({
                        queryKey: blockchainKeys.spaceReviews(spaceId),
                    })
                }
            } catch (e) {
                console.error('useReviewTransaction error:', e)
                let error = toError(e)

                // Handle specific error hash for Entitlement__NotMember
                if (
                    error.message.includes('0x1fe81382') ||
                    error.message.includes('cannot decode error') ||
                    error.message.includes('Entitlement__NotMember')
                ) {
                    error = new Error(
                        'You must be an active member to post a review. Your membership may have expired or been revoked.',
                    )
                }

                transactionResult = createTransactionContext<ReviewTransactionData>({
                    status: TransactionStatus.Failed,
                    error,
                    data: {
                        spaceId,
                        rating,
                        comment,
                        isUpdate: !!isUpdate,
                        isDelete: !!isDelete,
                    },
                })
                setTransactionContext(transactionResult)
                onError?.(error)
            } finally {
                isTransacting.current = false
            }
            return transactionResult
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
