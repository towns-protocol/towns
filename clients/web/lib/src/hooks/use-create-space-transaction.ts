import { SignerUndefinedError, toError } from '../types/error-types'
import {
    TransactionContext,
    TransactionStatus,
    createTransactionContext,
} from '../client/ZionClientTypes'
import { useCallback, useMemo, useRef, useState } from 'react'

import { BlockchainTransactionType } from '../types/web3-types'
import { CreateSpaceInfo } from '../types/zion-types'
import { Permission } from '../client/web3/ContractTypes'
import { RoomIdentifier } from '../types/room-identifier'
import { createExternalTokenStruct } from '../client/web3/ContractHelpers'
import { useSyncSpace } from './use-sync-space'
import { useTransactionStore } from '../store/use-transactions-store'
import { useWeb3Context } from '../components/Web3ContextProvider'
import { useZionClient } from './use-zion-client'
import { ITownArchitectBase } from '../client/web3/v3/ITownArchitectShim'

/**
 * Combine Matrix space creation and smart contract space
 * creation into one hook.
 */
export function useCreateSpaceTransaction() {
    const { createSpaceTransaction, waitForCreateSpaceTransaction } = useZionClient()
    const [transactionContext, setTransactionContext] = useState<
        TransactionContext<RoomIdentifier> | undefined
    >(undefined)
    const isTransacting = useRef<boolean>(false)
    const { signer } = useWeb3Context()
    const { syncSpace } = useSyncSpace()

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
            roleName: string,
            tokenAddresses: string[],
            memberPermissions: Permission[],
            everyonePermissions: Permission[] = [],
        ): Promise<TransactionContext<RoomIdentifier> | undefined> {
            if (isTransacting.current) {
                // Transaction already in progress
                return undefined
            }
            let transactionResult: TransactionContext<RoomIdentifier> | undefined
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
                let tokenEntitlement: ITownArchitectBase.MemberEntitlementStruct
                if (tokenAddresses.length) {
                    tokenEntitlement = {
                        role: {
                            name: roleName,
                            permissions: memberPermissions,
                        },
                        tokens: createExternalTokenStruct(tokenAddresses),
                        users: [],
                    }
                } else {
                    tokenEntitlement = {
                        role: {
                            name: '',
                            permissions: [],
                        },
                        tokens: [],
                        users: [],
                    }
                }

                transactionResult = await createSpaceTransaction(
                    createInfo,
                    tokenEntitlement,
                    everyonePermissions,
                    signer,
                )

                setTransactionContext(transactionResult)

                if (transactionResult?.status === TransactionStatus.Pending) {
                    // No error and transaction is pending
                    // Save it to local storage so we can track it
                    if (transactionResult.transaction && transactionResult.data) {
                        useTransactionStore.getState().storeTransaction({
                            hash: transactionResult.transaction?.hash as `0x${string}`,
                            type: BlockchainTransactionType.CreateSpace,
                            data: {
                                spaceId: transactionResult.data,
                            },
                        })
                    }

                    // Wait for transaction to be mined
                    transactionResult = await waitForCreateSpaceTransaction(transactionResult)
                    if (
                        transactionResult?.status === TransactionStatus.Success &&
                        transactionResult?.data
                    ) {
                        syncSpace(transactionResult.data)
                    }
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
        [createSpaceTransaction, signer, syncSpace, waitForCreateSpaceTransaction],
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
