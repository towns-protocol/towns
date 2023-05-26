import { SignerUndefinedError, toError } from '../types/error-types'
import {
    TransactionContext,
    TransactionStatus,
    createTransactionContext,
} from '../client/ZionClientTypes'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { BlockchainTransactionType } from '../types/web3-types'
import { CreateChannelInfo } from '../types/zion-types'
import { RoomIdentifier } from '../types/room-identifier'
import { useTransactionStore } from '../store/use-transactions-store'
import { useWeb3Context } from '../components/Web3ContextProvider'
import { useZionClient } from './use-zion-client'

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
            if (isTransacting.current) {
                // Transaction already in progress
                return
            }
            if (!signer) {
                setTransactionContext(
                    createTransactionContext(TransactionStatus.Failed, new SignerUndefinedError()),
                )
                return
            }
            // ok to proceed
            isTransacting.current = true
            try {
                const loading: TransactionContext<RoomIdentifier> = createTransactionContext(
                    TransactionStatus.Pending,
                )
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (e: any) {
                setTransactionContext(
                    createTransactionContext(TransactionStatus.Failed, toError(e)),
                )
            } finally {
                isTransacting.current = false
            }
        },
        [createChannelTransaction, signer, waitForCreateChannelTransaction],
    )

    useEffect(() => {
        console.log('[useCreateChannelTransaction]', 'states', {
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
