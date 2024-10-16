import {
    TransactionContext,
    TransactionStatus,
    createTransactionContext,
} from '../client/TownsClientTypes'
import { SignerUndefinedError, toError } from '../types/error-types'
import { useCallback, useMemo, useRef, useState } from 'react'

import { TSigner } from '../types/web3-types'
import { useTownsClient } from './use-towns-client'
import { getTransactionHashOrUserOpHash } from '@towns/userops'

export function useRefreshMetadataTx() {
    const [transactionContext, setTransactionContext] = useState<
        TransactionContext<void> | undefined
    >(undefined)
    const isTransacting = useRef<boolean>(false)
    const { refreshMetadataTransaction, waitForRefreshMetadataTransaction } = useTownsClient()

    const { data, isLoading, transactionHash, transactionStatus, error } = useMemo(() => {
        return {
            data: transactionContext?.data,
            isLoading: transactionContext?.status === TransactionStatus.Pending,
            transactionHash: getTransactionHashOrUserOpHash(transactionContext?.transaction),
            transactionStatus: transactionContext?.status ?? TransactionStatus.None,
            error: transactionContext?.error,
        }
    }, [transactionContext])

    const reset = useCallback(() => {
        setTransactionContext(undefined)
        isTransacting.current = false
    }, [])

    const _refreshMetadataTransaction = useCallback(
        async function (
            spaceId: string,
            signer: TSigner,
        ): Promise<TransactionContext<void> | undefined> {
            if (isTransacting.current) {
                console.warn('useRefreshMetadataTransaction', 'Transaction already in progress')
                return undefined
            }
            let transactionResult: TransactionContext<void> | undefined
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
                transactionResult = await refreshMetadataTransaction(spaceId, signer)
                setTransactionContext(transactionResult)
                if (transactionResult?.status === TransactionStatus.Pending) {
                    // Wait for transaction to be mined
                    transactionResult = await waitForRefreshMetadataTransaction(transactionResult)
                    setTransactionContext(transactionResult)
                }
            } catch (e) {
                console.error('useRefreshMetadataTransaction', e)
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
        [refreshMetadataTransaction, waitForRefreshMetadataTransaction],
    )

    return {
        isLoading,
        data,
        error,
        transactionHash,
        transactionStatus,
        isSuccess: transactionStatus === TransactionStatus.Success,
        refreshMetadataTransaction: _refreshMetadataTransaction,
        reset,
    }
}
