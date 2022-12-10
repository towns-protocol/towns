import { CreateChannelInfo } from '../types/matrix-types'
import { RoomIdentifier } from '../types/room-identifier'
import { useCallback } from 'react'
import { useRolesAndPermissions } from './use-roles-and-permissions'
import { useZionClient } from './use-zion-client'

/**
 * Combine Matrix channel creation and Smart Contract channel
 * creation into one hook.
 */
const TAG = '[useCreateChannelTransaction]'

export function useCreateChannelTransaction() {
    const { getRolesFromSpace } = useRolesAndPermissions()
    const { createWeb3Channel } = useZionClient()

    const createChannelWithSpaceRoles = useCallback(
        async function (createInfo: CreateChannelInfo): Promise<RoomIdentifier | undefined> {
            // helper function to create a channel with the same roles as the space
            const roleIds: number[] = []
            const spaceRoles = await getRolesFromSpace(createInfo.parentSpaceId.networkId)
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
        [getRolesFromSpace, createWeb3Channel],
    )

    return {
        createChannelWithSpaceRoles,
    }
}
