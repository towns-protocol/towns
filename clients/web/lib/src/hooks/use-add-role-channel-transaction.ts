import {
    TransactionContext,
    TransactionStatus,
    createTransactionContext,
} from '../client/TownsClientTypes'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { blockchainKeys } from '../query/query-keys'
import { toError } from '../types/error-types'
import { useQueryClient } from '../query/queryClient'
import { useTownsClient } from './use-towns-client'
import { TSigner } from '../types/web3-types'
import { getTransactionHashOrUserOpHash } from '@towns/userops'

/**
 * Hook to add a role to a channel with a transaction.
 */
export function useAddRoleToChannelTransaction() {
    const [transactionContext, setTransactionContext] = useState<
        TransactionContext<void> | undefined
    >(undefined)
    const isTransacting = useRef<boolean>(false)
    const { addRoleToChannelTransaction, waitForAddRoleToChannelTransaction } = useTownsClient()
    const queryClient = useQueryClient()

    const { data, isLoading, transactionHash, transactionStatus, error } = useMemo(() => {
        return {
            data: transactionContext?.data,
            isLoading: transactionContext?.status === TransactionStatus.Pending,
            transactionHash: getTransactionHashOrUserOpHash(transactionContext?.transaction),
            transactionStatus: transactionContext?.status ?? TransactionStatus.None,
            error: transactionContext?.error,
        }
    }, [transactionContext])

    const _addRoleToChannelTransaction = useCallback(
        async function (
            spaceNetworkId: string,
            channelNetworkId: string,
            roleId: number,
            signer: TSigner,
        ) {
            if (isTransacting.current) {
                // Transaction already in progress
                return
            }

            isTransacting.current = true
            try {
                const loading: TransactionContext<void> = {
                    status: TransactionStatus.Pending,
                    transaction: undefined,
                    receipt: undefined,
                    data: undefined,
                }
                setTransactionContext(loading)
                const txContext = await addRoleToChannelTransaction(
                    spaceNetworkId,
                    channelNetworkId,
                    roleId,
                    signer,
                )
                setTransactionContext(txContext)
                if (txContext?.status === TransactionStatus.Pending) {
                    if (txContext.transaction && txContext.data) {
                        // todo: add to the transaction store
                    }
                    // Wait for transaction to be mined
                    const rxContext = await waitForAddRoleToChannelTransaction(txContext)
                    setTransactionContext(rxContext)
                    if (rxContext?.status === TransactionStatus.Success) {
                        await queryClient.invalidateQueries({
                            queryKey: blockchainKeys.spaceAndChannel(
                                spaceNetworkId,
                                channelNetworkId,
                            ),
                        })
                    }
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (e: any) {
                setTransactionContext(
                    createTransactionContext({
                        status: TransactionStatus.Failed,
                        error: toError(e),
                    }),
                )
            } finally {
                isTransacting.current = false
            }
        },
        [addRoleToChannelTransaction, waitForAddRoleToChannelTransaction, queryClient],
    )

    useEffect(() => {
        console.log('useAddRoleToChannelTransaction', 'states', {
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
        addRoleToChannelTransaction: _addRoleToChannelTransaction,
    }
}
