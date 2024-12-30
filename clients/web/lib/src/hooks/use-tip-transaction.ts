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

/**
 * Hook to create a role with a transaction.
 */
export function useTipTransaction() {
    const [transactionContext, setTransactionContext] = useState<TipTransactionContext | undefined>(
        undefined,
    )
    const isTransacting = useRef<boolean>(false)
    const { tipTransaction, waitForTipTransaction } = useTownsClient()

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
        async function (args: TipParams): Promise<TipTransactionContext | undefined> {
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
                    await queryClient.invalidateQueries({
                        queryKey: blockchainKeys.spaceTotalTips(args.spaceId),
                    })
                }
            }
            return transactionResult
        },
        [tipTransaction, waitForTipTransaction],
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
