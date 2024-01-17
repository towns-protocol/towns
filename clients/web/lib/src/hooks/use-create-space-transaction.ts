import { SignerUndefinedError, toError } from '../types/error-types'
import {
    CreateSpaceTransactionContext,
    TransactionStatus,
    createTransactionContext,
} from '../client/ZionClientTypes'
import { useCallback, useMemo, useRef, useState } from 'react'

import { TSigner } from '../types/web3-types'
import { CreateSpaceInfo } from '../types/zion-types'
import { useZionClient } from './use-zion-client'
import { ITownArchitectBase } from '@river/web3'
import { getTransactionHashOrUserOpHash } from '@towns/userops'
/**
 * Combine Matrix space creation and smart contract space
 * creation into one hook.
 */
export function useCreateSpaceTransaction() {
    const { createSpaceTransaction, waitForCreateSpaceTransaction } = useZionClient()
    const [transactionContext, setTransactionContext] = useState<
        CreateSpaceTransactionContext | undefined
    >(undefined)
    const isTransacting = useRef<boolean>(false)

    const { data, isLoading, transactionHash, transactionStatus, error } = useMemo(() => {
        return {
            data: transactionContext?.data,
            isLoading: transactionContext?.status === TransactionStatus.Pending,
            transactionHash: getTransactionHashOrUserOpHash(transactionContext?.transaction),
            transactionStatus: transactionContext?.status ?? TransactionStatus.None,
            error: transactionContext?.error,
        }
    }, [transactionContext])

    const createSpaceTransactionWithRole = useCallback(
        async function (
            createInfo: CreateSpaceInfo,
            membershipInfo: ITownArchitectBase.MembershipStruct,
            signer: TSigner,
        ): Promise<CreateSpaceTransactionContext | undefined> {
            if (isTransacting.current) {
                // Transaction already in progress
                return undefined
            }
            let transactionResult: CreateSpaceTransactionContext | undefined
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
            try {
                transactionResult = createTransactionContext({ status: TransactionStatus.Pending })
                setTransactionContext(transactionResult)

                transactionResult = await createSpaceTransaction(createInfo, membershipInfo, signer)

                setTransactionContext(transactionResult)

                if (transactionResult?.status === TransactionStatus.Pending) {
                    // Wait for transaction to be mined
                    transactionResult = await waitForCreateSpaceTransaction(transactionResult)
                    setTransactionContext(transactionResult)
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
        [createSpaceTransaction, waitForCreateSpaceTransaction],
    )

    return {
        isLoading,
        data,
        error,
        transactionHash,
        transactionStatus,
        createSpaceTransactionWithRole,
    }
}
