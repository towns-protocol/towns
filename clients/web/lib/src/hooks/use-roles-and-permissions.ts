import { getAllRolesFromSpace, getFilteredRolesFromSpace } from '../client/web3/ZionContracts'

import { useCallback } from 'react'
import { useZionContext } from '../components/ZionContextProvider'

/**
 * Convience function for space roles and permissions.
 */

export function useRolesAndPermissions() {
    const { client } = useZionContext()

    const getRolesFromSpace = useCallback(
        async function (spaceNetworkId: string, includeAllRoles = false) {
            if (!client) {
                return undefined
            }

            if (includeAllRoles) {
                return await getAllRolesFromSpace(client, spaceNetworkId)
            } else {
                return await getFilteredRolesFromSpace(client, spaceNetworkId)
            }
        },
        [client],
    )

    return {
        getRolesFromSpace,
    }
}
