import {
    createTransactionContext,
    TransactionStatus,
    TipTransactionContext,
} from '../client/TownsClientTypes'
import { queryClient } from '../query/queryClient'
import { blockchainKeys } from '../query/query-keys'
import { SignerUndefinedError, toError } from '../types/error-types'
import { useCallback, useMemo, useRef, useState } from 'react'

import { useTownsClient } from './use-towns-client'
import { getTransactionHashOrUserOpHash } from '@towns/userops'
import { TipParams } from '../types/towns-types'
import { TipEventObject } from '@towns-protocol/generated/dev/typings/ITipping'

/**
 * Hook to create a role with a transaction.
 */
export function useTipTransaction() {
    const [transactionContext, setTransactionContext] = useState<TipTransactionContext | undefined>(
        undefined,
    )
    const isTransacting = useRef<boolean>(false)
    const { tipTransaction, waitForTipTransaction, clientSingleton } = useTownsClient()

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
    const _tip = useCallback(
        async function (
            args: TipParams,
            {
                onSuccess,
                onError,
            }: {
                onSuccess?: (tipEvent: TipEventObject) => void
                onError?: (error: Error) => void
            } = {},
        ): Promise<TipTransactionContext | undefined> {
            const { signer } = args
            if (isTransacting.current) {
                console.warn('useTipTransaction', 'Transaction already in progress')
                return undefined
            }
            let transactionResult: TipTransactionContext | undefined
            if (!signer) {
                // cannot sign the transaction. stop processing.
                transactionResult = createTransactionContext({
                    status: TransactionStatus.Failed,
                    error: new SignerUndefinedError(),
                })
                setTransactionContext(transactionResult)
                return transactionResult
            }
            // ok to proceed
            isTransacting.current = true
            transactionResult = createTransactionContext({
                status: TransactionStatus.Pending,
            })
            setTransactionContext(transactionResult)
            try {
                transactionResult = await tipTransaction(args)
                setTransactionContext(transactionResult)
                if (transactionResult?.status === TransactionStatus.Pending) {
                    // Wait for transaction to be mined
                    transactionResult = await waitForTipTransaction(transactionResult)
                    setTransactionContext(transactionResult)
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (e: any) {
                console.error('useTipTransaction', e)
                transactionResult = createTransactionContext({
                    status: TransactionStatus.Failed,
                    error: toError(e),
                })
                setTransactionContext(transactionResult)
            } finally {
                isTransacting.current = false
                if (transactionResult?.status === TransactionStatus.Success) {
                    if (transactionResult.data?.senderAddress) {
                        try {
                            const tipEvent = clientSingleton?.spaceDapp.getTipEvent(
                                args.spaceId,
                                transactionResult.receipt,
                                transactionResult.data.senderAddress,
                            )
                            if (tipEvent) {
                                onSuccess?.(tipEvent)
                            }
                        } catch (error) {
                            console.warn('useTipTransaction', 'Failed to parse tip event', error)
                        }
                    }

                    await queryClient.invalidateQueries({
                        queryKey: blockchainKeys.spaceTotalTips(args.spaceId),
                    })
                } else {
                    onError?.(transactionResult?.error ?? new Error('Unknown error'))
                }
            }
            return transactionResult
        },
        [clientSingleton?.spaceDapp, tipTransaction, waitForTipTransaction],
    )

    return {
        isLoading,
        data,
        error,
        transactionHash,
        transactionStatus,
        tip: _tip,
    }
}
