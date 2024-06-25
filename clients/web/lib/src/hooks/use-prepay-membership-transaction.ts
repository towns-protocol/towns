import {
    PrepayMembershipTransactionContext,
    TransactionStatus,
    createTransactionContext,
} from '../client/TownsClientTypes'
import { SignerUndefinedError, toError } from '../types/error-types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { TSigner } from '../types/web3-types'
import { blockchainKeys } from '../query/query-keys'
import { useQueryClient } from '../query/queryClient'
import { useTownsClient } from './use-towns-client'
import { getTransactionHashOrUserOpHash } from '@towns/userops'

/**
 * Hook to prepay memberships for a space.
 */
export function usePrepayMembershipTransaction() {
    const [transactionContext, setTransactionContext] = useState<
        PrepayMembershipTransactionContext | undefined
    >(undefined)
    const isTransacting = useRef<boolean>(false)
    const { prepayMembershipTransaction, waitForPrepayMembershipTransaction } = useTownsClient()
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

    // update role with new permissions, tokens, and users
    const _prepayMembershipTransaction = useCallback(
        async function (
            spaceNetworkId: string,
            supply: number,
            signer: TSigner,
        ): Promise<PrepayMembershipTransactionContext | undefined> {
            if (isTransacting.current) {
                console.warn('useUpdateRoleTransaction', 'Transaction already in progress')
                return undefined
            }
            let transactionResult: PrepayMembershipTransactionContext | undefined
            if (!signer) {
                console.error('useUpdateRoleTransaction', 'Signer is undefined')
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
                transactionResult = await prepayMembershipTransaction(
                    spaceNetworkId,
                    supply,
                    signer,
                )
                setTransactionContext(transactionResult)
                if (transactionResult?.status === TransactionStatus.Pending) {
                    // Wait for transaction to be mined
                    transactionResult = await waitForPrepayMembershipTransaction(transactionResult)
                    setTransactionContext(transactionResult)
                    if (transactionResult?.status === TransactionStatus.Success) {
                        await queryClient.invalidateQueries({
                            queryKey: blockchainKeys.prepaidSupply(spaceNetworkId),
                        })
                    }
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (e: any) {
                console.error('useUpdateRoleTransaction', 'Transaction failed', e)
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
        [prepayMembershipTransaction, queryClient, waitForPrepayMembershipTransaction],
    )

    useEffect(() => {
        console.log('useUpdateRoleTransaction', 'states', {
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
        prepayMembershipTransaction: _prepayMembershipTransaction,
    }
}
