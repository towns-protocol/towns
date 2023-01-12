import { getFilteredRolesFromSpace } from '../client/web3/ContractHelpers'

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
                return await client.spaceDapp.getRoles(spaceNetworkId)
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
