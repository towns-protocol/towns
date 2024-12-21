import {
    createTransactionContext,
    TransactionStatus,
    TransactionContext,
} from '../client/TownsClientTypes'
import { SignerUndefinedError, toError } from '../types/error-types'
import { useCallback, useMemo, useRef, useState } from 'react'

import { useTownsClient } from './use-towns-client'
import { getTransactionHashOrUserOpHash } from '@towns/userops'
import { CheckInParams } from '../types/towns-types'

export function useCheckInTransaction() {
    const [transactionContext, setTransactionContext] = useState<
        TransactionContext<void> | undefined
    >(undefined)
    const isTransacting = useRef<boolean>(false)
    const { checkInTransaction, waitForCheckInTransaction } = useTownsClient()

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
    const _checkIn = useCallback(
        async function (args: CheckInParams): Promise<TransactionContext<void> | undefined> {
            const { signer } = args
            if (isTransacting.current) {
                console.warn(
                    '[river-points] useCheckInTransaction',
                    'Transaction already in progress',
                )
                return undefined
            }
            let transactionResult: TransactionContext<void> | undefined
            if (!signer) {
                // cannot sign the transaction. stop processing.
                transactionResult = createTransactionContext({
                    status: TransactionStatus.Failed,
                    error: new SignerUndefinedError(),
                })
                setTransactionContext(transactionResult)
                return transactionResult
            }
            console.log('[river-points] useCheckInTransaction', 'ok to proceed')
            // ok to proceed
            isTransacting.current = true

            transactionResult = createTransactionContext({
                status: TransactionStatus.Pending,
            })

            setTransactionContext(transactionResult)
            try {
                transactionResult = await checkInTransaction(signer)
                setTransactionContext(transactionResult)
                if (transactionResult?.status === TransactionStatus.Pending) {
                    // Wait for transaction to be mined
                    transactionResult = await waitForCheckInTransaction(transactionResult)
                    setTransactionContext(transactionResult)
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (e: any) {
                console.error('[river-points] useCheckInTransaction', e)
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
        [checkInTransaction, waitForCheckInTransaction],
    )

    return {
        isLoading,
        data,
        error,
        transactionHash,
        transactionStatus,
        checkIn: _checkIn,
    }
}
