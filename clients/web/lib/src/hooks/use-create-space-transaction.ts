import { TransactionContext, TransactionStatus } from '../client/ZionClientTypes'
import { createExternalTokenEntitlements, createPermissions } from '../client/web3/ZionContracts'
import { useCallback, useMemo, useState } from 'react'

import { CreateSpaceInfo } from '../types/matrix-types'
import { DataTypes } from '../client/web3/shims/ZionSpaceManagerShim'
import { Permission } from '../client/web3/ZionContractTypes'
import { RoomIdentifier } from '../types/room-identifier'
import { useZionClient } from './use-zion-client'

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

    const createSpaceTransactionWithMemberRole = useCallback(
        async function (
            createInfo: CreateSpaceInfo,
            tokenAddresses: string[],
            tokenGrantedPermissions: Permission[],
            everyonePermissions: Permission[] = [],
        ): Promise<void> {
            const loading: TransactionContext<RoomIdentifier> = {
                status: TransactionStatus.Pending,
                transaction: undefined,
                receipt: undefined,
                data: undefined,
            }
            setTransactionContext(loading)
            let tokenEntitlement: DataTypes.CreateSpaceEntitlementDataStruct
            if (tokenAddresses.length) {
                tokenEntitlement = {
                    roleName: 'Member',
                    permissions: createPermissions(tokenGrantedPermissions),
                    externalTokenEntitlements: createExternalTokenEntitlements(tokenAddresses),
                    users: [],
                }
            } else {
                tokenEntitlement = {
                    roleName: '',
                    permissions: [],
                    externalTokenEntitlements: [],
                    users: [],
                }
            }

            const everyonePerms = createPermissions(everyonePermissions)
            const txContext = await createSpaceTransaction(
                createInfo,
                tokenEntitlement,
                everyonePerms,
            )
            setTransactionContext(txContext)

            if (txContext?.status === TransactionStatus.Pending) {
                // No error and transaction is pending
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
        createSpaceTransactionWithMemberRole,
    }
}
