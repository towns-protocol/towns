import { CreateChannelInfo, CreateSpaceInfo, RoomIdentifier } from 'types/matrix-types'
import {
    createExternalTokenEntitlements,
    createPermissions,
    getRolesFromSpace,
} from '../client/web3/ZionContracts'

import { DataTypes } from '../client/web3/shims/ZionSpaceManagerShim'
import { Permission } from '../client/web3/ZionContractTypes'
import { useCallback } from 'react'
import { useZionClient } from './use-zion-client'
import { useZionContext } from '../components/ZionContextProvider'

/**
 * Combine Matrix space creation and Smart Contract space
 * creation into one function.
 */
const TAG = '[useIntegratedSpaceManagement]'

export function useIntegratedSpaceManagement() {
    const { client } = useZionContext()
    const { createWeb3Channel, createWeb3Space } = useZionClient()

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

    const createChannelWithSpaceRoles = useCallback(
        async function (createInfo: CreateChannelInfo): Promise<RoomIdentifier | undefined> {
            // helper function to create a channel with the same roles as the space
            if (!client) {
                return undefined
            }

            const roleIds: number[] = []
            const allowedRoles = await getRolesFromSpace(
                client,
                createInfo.parentSpaceId.matrixRoomId,
            )
            for (const r of allowedRoles) {
                roleIds.push(r.roleId.toNumber())
            }
            try {
                const roomId = await createWeb3Channel(createInfo)
                return roomId
            } catch (e) {
                console.error(TAG, e)
            }

            return undefined
        },
        [client, createWeb3Channel],
    )

    return {
        createChannelWithSpaceRoles,
        createSpaceWithMemberRole,
    }
}
