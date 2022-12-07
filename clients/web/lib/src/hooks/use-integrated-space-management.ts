import { CreateChannelInfo, CreateSpaceInfo, RoomIdentifier } from 'types/matrix-types'
import {
    createExternalTokenEntitlements,
    createPermissions,
    getFilteredRolesFromSpace,
    getAllRolesFromSpace,
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

    const _getRolesFromSpace = useCallback(
        async function (matrixSpaceId: string, includeAllRoles = false) {
            if (!client) {
                return undefined
            }

            if (includeAllRoles) {
                return await getAllRolesFromSpace(client, matrixSpaceId)
            } else {
                return await getFilteredRolesFromSpace(client, matrixSpaceId)
            }
        },
        [client],
    )

    const createSpaceWithMemberRole = useCallback(
        async function (
            createInfo: CreateSpaceInfo,
            tokenAddresses: string[],
            tokenGrantedPermissions: Permission[],
            everyonePermissions: Permission[] = [],
        ): Promise<RoomIdentifier | undefined> {
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
            const roleIds: number[] = []
            const spaceRoles = await _getRolesFromSpace(createInfo.parentSpaceId.matrixRoomId)
            if (spaceRoles) {
                for (const r of spaceRoles) {
                    roleIds.push(r.roleId.toNumber())
                }
                try {
                    const roomId = await createWeb3Channel(createInfo)
                    return roomId
                } catch (e) {
                    console.error(TAG, e)
                }
            }

            return undefined
        },
        [_getRolesFromSpace, createWeb3Channel],
    )

    return {
        createChannelWithSpaceRoles,
        createSpaceWithMemberRole,
        getRolesFromSpace: _getRolesFromSpace,
    }
}
