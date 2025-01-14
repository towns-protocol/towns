import {
    createTransactionContext,
    TransactionStatus,
    TransferAssetTransactionContext,
} from '../client/TownsClientTypes'
import { SignerUndefinedError, toError } from '../types/error-types'
import { useCallback, useMemo, useRef, useState } from 'react'

import { TSigner } from '../types/web3-types'
import { useTownsClient } from './use-towns-client'
import { getTransactionHashOrUserOpHash } from '@towns/userops'

/**
 * Hook to create a role with a transaction.
 */
export function useTransferAssetTransaction() {
    const [transactionContext, setTransactionContext] = useState<
        TransferAssetTransactionContext | undefined
    >(undefined)
    const isTransacting = useRef<boolean>(false)
    const { transferAsset, waitForTransferAssetTransaction } = useTownsClient()

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
    const _transferAsset = useCallback(
        async function (
            data: NonNullable<TransferAssetTransactionContext['data']>,
            signer: TSigner,
        ): Promise<TransferAssetTransactionContext | undefined> {
            if (isTransacting.current) {
                console.warn('useTransferAssetTransaction', 'Transaction already in progress')
                return undefined
            }
            let transactionResult: TransferAssetTransactionContext | undefined
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
                transactionResult = await transferAsset(data, signer)
                setTransactionContext(transactionResult)
                if (transactionResult?.status === TransactionStatus.Pending) {
                    // Wait for transaction to be mined
                    transactionResult = await waitForTransferAssetTransaction(transactionResult)
                    setTransactionContext(transactionResult)
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (e: any) {
                console.error('useTransferAssetTransaction', e)
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
        [transferAsset, waitForTransferAssetTransaction],
    )

    return {
        isLoading,
        data,
        error,
        transactionHash,
        transactionStatus,
        transferAsset: _transferAsset,
    }
}
