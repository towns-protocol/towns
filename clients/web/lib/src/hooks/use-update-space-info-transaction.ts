import {
    TransactionContext,
    TransactionStatus,
    createTransactionContext,
} from '../client/TownsClientTypes'
import { SignerUndefinedError, toError } from '../types/error-types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { TSigner } from '../types/web3-types'
import { useTownsClient } from './use-towns-client'
import { getTransactionHashOrUserOpHash } from '@towns/userops'
import { useMutationSpaceInfoCache } from './use-mutation-space-info-cache'

/**
 * Hook to update space name with a transaction.
 */
export function useUpdateSpaceInfoTransaction() {
    const [transactionContext, setTransactionContext] = useState<
        TransactionContext<void> | undefined
    >(undefined)
    const isTransacting = useRef<boolean>(false)
    const { updateSpaceInfoTransaction, waitForUpdateSpaceInfoTransaction, spaceDapp } =
        useTownsClient()
    const spaceInfoCache = useMutationSpaceInfoCache()

    const { data, isLoading, transactionHash, transactionStatus, error } = useMemo(() => {
        return {
            data: transactionContext?.data,
            isLoading: transactionContext?.status === TransactionStatus.Pending,
            transactionHash: getTransactionHashOrUserOpHash(transactionContext?.transaction),
            transactionStatus: transactionContext?.status ?? TransactionStatus.None,
            error: transactionContext?.error,
        }
    }, [transactionContext])

    // update space info
    const _updateSpaceInfoTransaction = useCallback(
        async function (
            spaceNetworkId: string,
            name: string,
            uri: string,
            shortDescription: string,
            longDescription: string,
            signer: TSigner,
        ): Promise<TransactionContext<void> | undefined> {
            if (isTransacting.current) {
                console.warn('useUpdateSpaceInfoTransaction', 'Transaction already in progress')
                return undefined
            }
            let transactionResult: TransactionContext<void> | undefined
            if (!signer) {
                console.error('useUpdateSpaceInfoTransaction', 'Signer is undefined')
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
                transactionResult = await updateSpaceInfoTransaction(
                    spaceNetworkId,
                    name,
                    uri,
                    shortDescription,
                    longDescription,
                    signer,
                )
                setTransactionContext(transactionResult)
                if (transactionResult?.status === TransactionStatus.Pending) {
                    // Wait for transaction to be mined
                    transactionResult = await waitForUpdateSpaceInfoTransaction(transactionResult)
                    setTransactionContext(transactionResult)
                    if (transactionResult?.status === TransactionStatus.Success) {
                        if (spaceDapp) {
                            const spaceInfo = await spaceDapp.getSpaceInfo(spaceNetworkId)
                            // Update cache
                            spaceInfoCache.mutate(spaceInfo)
                        }
                    }
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (e: any) {
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
        [spaceDapp, spaceInfoCache, updateSpaceInfoTransaction, waitForUpdateSpaceInfoTransaction],
    )

    useEffect(() => {
        console.log('useUpdateSpaceInfoTransaction', 'states', {
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
        updateSpaceInfoTransaction: _updateSpaceInfoTransaction,
    }
}
