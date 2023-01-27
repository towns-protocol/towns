import { getFilteredRolesFromSpace } from '../client/web3/ContractHelpers'
import { useCallback } from 'react'
import { useZionContext } from '../components/ZionContextProvider'

/**
 * Convience function for space roles and permissions.
 */

export function useRolesAndPermissions() {
    const { client } = useZionContext()

    const getRolesFromSpace = useCallback(
        async function (spaceId: string, includeAllRoles = false) {
            if (!client) {
                return undefined
            }
            if (includeAllRoles) {
                return await client.spaceDapp.getRoles(spaceId)
            } else {
                return await getFilteredRolesFromSpace(client, spaceId)
            }
        },
        [client],
    )

    const getRole = useCallback(
        async function (spaceId: string, roleId: number) {
            if (!client) {
                return undefined
            }
            const role = await client.spaceDapp.getRole(spaceId, roleId)
            return role
        },
        [client],
    )

    return {
        getRole,
        getRolesFromSpace,
    }
}
