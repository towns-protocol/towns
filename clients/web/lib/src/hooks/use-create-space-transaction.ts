import { TransactionContext, TransactionStatus } from '../client/ZionClientTypes'
import { useCallback, useMemo, useState } from 'react'

import { CreateSpaceInfo } from '../types/matrix-types'
import { Permission } from '../client/web3/ContractTypes'
import { RoomIdentifier } from '../types/room-identifier'
import { SpaceFactoryDataTypes } from '../client/web3/shims/SpaceFactoryShim'
import { createExternalTokenStruct } from '../client/web3/ContractHelpers'
import { useZionClient } from './use-zion-client'
import { StoredTransactionType, useTransactionStore } from '../store/use-transactions-store'

/**
 * Combine Matrix space creation and smart contract space
 * creation into one hook.
 */
export function useCreateSpaceTransaction() {
    const { createSpaceTransaction, waitForCreateSpaceTransaction } = useZionClient()
    const [transactionContext, setTransactionContext] = useState<
        TransactionContext<RoomIdentifier> | undefined
    >(undefined)

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
        ): Promise<void> {
            const loading: TransactionContext<RoomIdentifier> = {
                status: TransactionStatus.Pending,
                transaction: undefined,
                receipt: undefined,
                data: undefined,
            }
            setTransactionContext(loading)
            let tokenEntitlement: SpaceFactoryDataTypes.CreateSpaceExtraEntitlementsStruct
            if (tokenAddresses.length) {
                tokenEntitlement = {
                    roleName,
                    permissions: memberPermissions,
                    tokens: createExternalTokenStruct(tokenAddresses),
                    users: [],
                }
            } else {
                tokenEntitlement = {
                    roleName: '',
                    permissions: [],
                    tokens: [],
                    users: [],
                }
            }

            const txContext = await createSpaceTransaction(
                createInfo,
                tokenEntitlement,
                everyonePermissions,
            )

            setTransactionContext(txContext)

            if (txContext?.status === TransactionStatus.Pending) {
                // No error and transaction is pending
                // Save it to local storage so we can track it
                if (txContext.transaction && txContext.data) {
                    useTransactionStore.getState().storeTransaction({
                        hash: txContext.transaction?.hash as `0x${string}`,
                        type: StoredTransactionType.CreateSpace,
                        data: {
                            spaceId: txContext.data,
                        },
                    })
                }

                // Wait for transaction to be mined
                const rxContext = await waitForCreateSpaceTransaction(txContext)
                setTransactionContext(rxContext)
            }
        },
        [createSpaceTransaction, waitForCreateSpaceTransaction],
    )

    /*
    console.log('useCreateSpaceTransaction', 'states', {
        isLoading,
        data,
        error,
        transactionStatus,
        transactionHash,
    })
    */
    return {
        isLoading,
        data,
        error,
        transactionHash,
        transactionStatus,
        createSpaceTransactionWithRole,
    }
}
