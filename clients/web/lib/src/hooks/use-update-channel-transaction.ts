import { ChannelUpdateTransactionContext, TransactionStatus } from '../client/ZionClientTypes'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { UpdateChannelInfo } from 'types/zion-types'
import { removeSyncedEntitleChannelsQueries } from '../query/removeSyncedEntitledChannelQueries'
import { useTransactionStore } from '../store/use-transactions-store'
import { BlockchainTransactionType } from '../types/web3-types'
import { useZionClient } from './use-zion-client'
import { useWeb3Context } from '../components/Web3ContextProvider'

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

            isTransacting.current = true

            removeSyncedEntitleChannelsQueries()

            try {
                const loading: ChannelUpdateTransactionContext = {
                    status: TransactionStatus.Pending,
                    transaction: undefined,
                    receipt: undefined,
                    data: undefined,
                    hasOffChainUpdate: updateChannelInfo.updatedChannelTopic !== undefined,
                }
                setTransactionContext(loading)
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
