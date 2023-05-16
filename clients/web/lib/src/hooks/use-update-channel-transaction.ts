import { ChannelUpdateTransactionContext, TransactionStatus } from '../client/ZionClientTypes'
import { SignerUndefinedError, toError } from '../types/error-types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { BlockchainTransactionType } from '../types/web3-types'
import { UpdateChannelInfo } from 'types/zion-types'
import { removeSyncedEntitleChannelsQueries } from '../query/removeSyncedEntitledChannelQueries'
import { useTransactionStore } from '../store/use-transactions-store'
import { useWeb3Context } from '../components/Web3ContextProvider'
import { useZionClient } from './use-zion-client'

/**
 * Hook to create a role with a transaction.
 */
export function useUpdateChannelTransaction() {
    const [transactionContext, setTransactionContext] = useState<
        ChannelUpdateTransactionContext | undefined
    >(undefined)
    const isTransacting = useRef<boolean>(false)
    const { updateChannelTransaction, waitForUpdateChannelTransaction } = useZionClient()
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

    // update role with new permissions, tokens, and users
    const _updateChannelTransaction = useCallback(
        async function (updateChannelInfo: UpdateChannelInfo) {
            if (isTransacting.current) {
                // Transaction already in progress
                return
            }
            if (!signer) {
                setTransactionContext(
                    createTransactionContext(
                        TransactionStatus.Failed,
                        false,
                        new SignerUndefinedError(),
                    ),
                )
                return
            }
            // ok to proceed
            isTransacting.current = true
            const hasOffChainUpdate = updateChannelInfo.updatedChannelTopic !== undefined
            const loading: ChannelUpdateTransactionContext = createTransactionContext(
                TransactionStatus.Pending,
                hasOffChainUpdate,
            )
            setTransactionContext(loading)

            removeSyncedEntitleChannelsQueries()

            try {
                const txContext = await updateChannelTransaction(updateChannelInfo, signer)
                setTransactionContext(txContext)
                if (txContext?.status === TransactionStatus.Pending) {
                    // save it to local storage so we can track it
                    if (txContext.transaction && txContext.data) {
                        useTransactionStore.getState().storeTransaction({
                            hash: txContext.transaction?.hash as `0x${string}`,
                            type: BlockchainTransactionType.EditChannel,
                        })
                    }
                    // Wait for transaction to be mined
                    const rxContext = await waitForUpdateChannelTransaction(txContext)
                    setTransactionContext(rxContext)
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (e: any) {
                setTransactionContext(
                    createTransactionContext(
                        TransactionStatus.Failed,
                        hasOffChainUpdate,
                        toError(e),
                    ),
                )
            } finally {
                isTransacting.current = false
            }
        },
        [signer, updateChannelTransaction, waitForUpdateChannelTransaction],
    )

    useEffect(() => {
        console.log('useUpdateChannelTransaction', 'states', {
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
        updateChannelTransaction: _updateChannelTransaction,
    }
}

function createTransactionContext(
    status: TransactionStatus,
    hasOffChainUpdate: boolean,
    error?: Error,
): ChannelUpdateTransactionContext {
    return {
        status,
        transaction: undefined,
        receipt: undefined,
        data: undefined,
        hasOffChainUpdate,
        error,
    }
}
