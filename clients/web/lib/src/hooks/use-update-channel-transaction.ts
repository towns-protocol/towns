import {
    ChannelUpdateTransactionContext,
    TransactionStatus,
    createChannelUpdateTransactionContext,
} from '../client/ZionClientTypes'
import { SignerUndefinedError, toError } from '../types/error-types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { BlockchainTransactionType } from '../types/web3-types'
import { blockchainKeys } from '../query/query-keys'
import { UpdateChannelInfo } from 'types/zion-types'
import { removeSyncedEntitledChannelsQueriesForSpace } from '../query/removeSyncedEntitledChannelQueries'
import { useQueryClient } from '../query/queryClient'
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
    const queryClient = useQueryClient()

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
        async function (
            updateChannelInfo: UpdateChannelInfo,
        ): Promise<ChannelUpdateTransactionContext | undefined> {
            if (isTransacting.current) {
                console.warn('useUpdateChannelTransaction', 'Transaction already in progress')
                return undefined
            }
            let transactionResult: ChannelUpdateTransactionContext | undefined
            const hasOffChainUpdate = updateChannelInfo.updatedChannelTopic !== undefined
            if (!signer) {
                // cannot sign the transaction. stop processing.
                transactionResult = createChannelUpdateTransactionContext({
                    status: TransactionStatus.Failed,
                    hasOffChainUpdate,
                    error: new SignerUndefinedError(),
                })
                setTransactionContext(transactionResult)
                return transactionResult
            }
            // ok to proceed
            isTransacting.current = true
            transactionResult = createChannelUpdateTransactionContext({
                status: TransactionStatus.Pending,
                hasOffChainUpdate,
            })
            setTransactionContext(transactionResult)
            removeSyncedEntitledChannelsQueriesForSpace(updateChannelInfo.parentSpaceId.networkId)
            try {
                transactionResult = await updateChannelTransaction(updateChannelInfo, signer)
                setTransactionContext(transactionResult)
                if (transactionResult?.status === TransactionStatus.Pending) {
                    // save it to local storage so we can track it
                    if (transactionResult.transaction && transactionResult.data) {
                        useTransactionStore.getState().storeTransaction({
                            hash: transactionResult.transaction?.hash as `0x${string}`,
                            type: BlockchainTransactionType.EditChannel,
                        })
                    }
                    // Wait for transaction to be mined
                    transactionResult = await waitForUpdateChannelTransaction(transactionResult)
                    setTransactionContext(transactionResult)
                    if (transactionResult?.status === TransactionStatus.Success) {
                        await queryClient.invalidateQueries(
                            blockchainKeys.spaceAndChannel(
                                updateChannelInfo.parentSpaceId.networkId,
                                updateChannelInfo.channelId.networkId,
                            ),
                        )
                    }
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (e: any) {
                console.error('useUpdateChannelTransaction', e)
                transactionResult = createChannelUpdateTransactionContext({
                    status: TransactionStatus.Failed,
                    hasOffChainUpdate,
                    error: toError(e),
                })
                setTransactionContext(transactionResult)
            } finally {
                isTransacting.current = false
            }
            return transactionResult
        },
        [queryClient, signer, updateChannelTransaction, waitForUpdateChannelTransaction],
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
