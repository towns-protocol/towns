import { TransactionContext, TransactionStatus } from '../client/ZionClientTypes'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { BlockchainTransactionType } from '../types/web3-types'
import { CreateChannelInfo } from '../types/zion-types'
import { RoomIdentifier } from '../types/room-identifier'
import { useTransactionStore } from '../store/use-transactions-store'
import { useZionClient } from './use-zion-client'
import { useWeb3Context } from '../components/Web3ContextProvider'

/**
 * Combine Matrix channel creation and Smart Contract channel
 * creation into one hook.
 */
export function useCreateChannelTransaction() {
    const { createChannelTransaction, waitForCreateChannelTransaction } = useZionClient()
    const [transactionContext, setTransactionContext] = useState<
        TransactionContext<RoomIdentifier> | undefined
    >(undefined)
    const { signer } = useWeb3Context()
    const isTransacting = useRef<boolean>(false)

    const { data, isLoading, transactionHash, transactionStatus, error } = useMemo(() => {
        return {
            data: transactionContext?.data,
            isLoading: transactionContext?.status === TransactionStatus.Pending,
            transactionHash: transactionContext?.transaction?.hash,
            transactionStatus: transactionContext?.status ?? TransactionStatus.None,
            error: transactionContext?.error,
        }
    }, [transactionContext])

    const _createChannelTransaction = useCallback(
        async function (createInfo: CreateChannelInfo): Promise<void> {
            const loading: TransactionContext<RoomIdentifier> = {
                status: TransactionStatus.Pending,
                transaction: undefined,
                receipt: undefined,
                data: undefined,
            }
            if (isTransacting.current) {
                // Transaction already in progress
                return
            }

            isTransacting.current = true
            try {
                setTransactionContext(loading)
                const txContext = await createChannelTransaction(createInfo, signer)
                setTransactionContext(txContext)
                if (txContext?.status === TransactionStatus.Pending) {
                    // No error and transaction is pending
                    // save it to local storage so we can track it
                    if (txContext.transaction && txContext.data) {
                        useTransactionStore.getState().storeTransaction({
                            hash: txContext.transaction?.hash as `0x${string}`,
                            type: BlockchainTransactionType.CreateChannel,
                            data: {
                                parentSpaceId: txContext.parentSpaceId,
                                spaceId: txContext.data,
                            },
                        })
                    }
                    // Wait for transaction to be mined
                    const rxContext = await waitForCreateChannelTransaction(txContext)
                    setTransactionContext(rxContext)
                }
            } finally {
                isTransacting.current = false
            }
        },
        [createChannelTransaction, signer, waitForCreateChannelTransaction],
    )

    useEffect(() => {
        console.log('useCreateChannelTransaction', 'states', {
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
        createChannelTransaction: _createChannelTransaction,
    }
}
