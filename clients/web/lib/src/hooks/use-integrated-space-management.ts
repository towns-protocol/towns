import { CreateSpaceInfo, RoomIdentifier } from 'types/matrix-types'
import { createExternalTokenEntitlements, createPermissions } from '../client/web3/ZionContracts'

import { DataTypes } from '../client/web3/shims/ZionSpaceManagerShim'
import { Permission } from 'client/web3/ZionContractTypes'
import { useCallback } from 'react'
import { useZionClient } from './use-zion-client'

/**
 * Combine Matrix space creation and Smart Contract space
 * creation into one function.
 */
const TAG = '[useIntegratedSpaceManagement]'

export function useIntegratedSpaceManagement() {
    const { createWeb3Space } = useZionClient()

    const createSpaceWithMemberRole = useCallback(
        async function (
            createInfo: CreateSpaceInfo,
            tokenAddresses: string[],
            tokenGrantedPermissions: Permission[],
            everyonePermissions: Permission[] = [],
        ): Promise<RoomIdentifier | undefined> {
            const permissions = createPermissions(tokenGrantedPermissions)
            const externalTokenEntitlements = createExternalTokenEntitlements(tokenAddresses)
            const tokenEntitlement: DataTypes.CreateSpaceEntitlementDataStruct = {
                roleName: 'Member',
                permissions,
                externalTokenEntitlements,
                users: [],
            }

            const everyonePerms = createPermissions(everyonePermissions)
            try {
                const roomId = await createWeb3Space(createInfo, tokenEntitlement, everyonePerms)
                return roomId
            } catch (e: unknown) {
                console.error(TAG, e)
            }

            return undefined
        },
        [createWeb3Space],
    )

    return {
        createSpaceWithMemberRole,
    }
}
