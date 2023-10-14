import { SignerUndefinedError, toError } from '../types/error-types'
import {
    CreateSpaceTransactionContext,
    TransactionStatus,
    createTransactionContext,
} from '../client/ZionClientTypes'
import { useCallback, useMemo, useRef, useState } from 'react'

import { BlockchainTransactionType } from '../types/web3-types'
import { CreateSpaceInfo } from '../types/zion-types'
import { useTransactionStore } from '../store/use-transactions-store'
import { useWeb3Context } from '../components/Web3ContextProvider'
import { useZionClient } from './use-zion-client'
import { ITownArchitectBase } from '@river/web3'
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

    const createSpaceTransactionWithRole = useCallback(
        async function (
            createInfo: CreateSpaceInfo,
            membershipInfo: ITownArchitectBase.MembershipStruct,
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
                    // No error and transaction is pending
                    // Save it to local storage so we can track it
                    if (transactionResult.transaction && transactionResult.data) {
                        useTransactionStore.getState().storeTransaction({
                            hash: transactionResult.transaction?.hash as `0x${string}`,
                            type: BlockchainTransactionType.CreateSpace,
                            data: {
                                spaceId: transactionResult.data.spaceId,
                            },
                        })
                    }

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
        [createSpaceTransaction, signer, waitForCreateSpaceTransaction],
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
