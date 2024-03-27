import { SignerUndefinedError, toError } from '../types/error-types'
import {
    CreateSpaceTransactionContext,
    TransactionStatus,
    createTransactionContext,
} from '../client/TownsClientTypes'
import { useCallback, useMemo, useRef, useState } from 'react'

import { TSigner } from '../types/web3-types'
import { CreateSpaceInfo } from '../types/towns-types'
import { useTownsClient } from './use-towns-client'
import { IArchitectBase } from '@river-build/web3'
import { getTransactionHashOrUserOpHash } from '@towns/userops'
import { useMyDefaultUsernames } from './use-my-default-usernames'
/**
 * Combine space creation and smart contract space
 * creation into one hook.
 */
export function useCreateSpaceTransaction() {
    const { createSpaceTransaction, waitForCreateSpaceTransaction } = useTownsClient()
    const [transactionContext, setTransactionContext] = useState<
        CreateSpaceTransactionContext | undefined
    >(undefined)
    const isTransacting = useRef<boolean>(false)
    const defaultUsernames = useMyDefaultUsernames()

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
            membershipInfo: IArchitectBase.MembershipStruct,
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
                    transactionResult = await waitForCreateSpaceTransaction(
                        transactionResult,
                        defaultUsernames,
                    )
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
        [createSpaceTransaction, defaultUsernames, waitForCreateSpaceTransaction],
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

/**
 * Space creation can fail when running in a CI environment.
 * This hook will retry the space creation transaction
 * Don't use this hook for production code
 */
export function useCreateSpaceTransactionWithRetries() {
    const {
        isLoading,
        data,
        error,
        transactionHash,
        transactionStatus,
        createSpaceTransactionWithRole,
    } = useCreateSpaceTransaction()

    const createSpaceTransactionWithRetries = useCallback(
        async function (
            createInfo: CreateSpaceInfo,
            membershipInfo: IArchitectBase.MembershipStruct,
            signer: TSigner,
        ) {
            const retryInterval = 5_000
            const maxRetryDuration = 60_000
            let elapsedRetryTime = 0
            let retryCount = 0
            let transactionResult: CreateSpaceTransactionContext | undefined

            const retryFunction = async () => {
                const startTime = Date.now()
                while (elapsedRetryTime < maxRetryDuration) {
                    try {
                        transactionResult = await createSpaceTransactionWithRole(
                            createInfo,
                            membershipInfo,
                            signer,
                        )
                        if (
                            transactionResult?.error ||
                            transactionResult?.status === TransactionStatus.Failed
                        ) {
                            throw transactionResult.error
                        }
                        return transactionResult
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } catch (error: any) {
                        console.error(
                            `[useCreateSpaceTransactionWithRetries] Error creating space transaction: ${error}. Retry count: ${retryCount++}`,
                        )
                    }

                    elapsedRetryTime += Date.now() - startTime

                    await new Promise((resolve) => setTimeout(resolve, retryInterval))
                }
                console.error('[useCreateSpaceTransactionWithRetries] completely failed, giving up')
                return transactionResult
            }

            return retryFunction()
        },
        [createSpaceTransactionWithRole],
    )

    return {
        isLoading,
        data,
        error,
        transactionHash,
        transactionStatus,
        createSpaceTransactionWithRetries,
    }
}
