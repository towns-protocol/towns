import { useQuery, useQueryClient } from '../query/queryClient'

import { blockchainKeys } from '../query/query-keys'
import { useCallback } from 'react'
import { useZionContext } from '../components/ZionContextProvider'
import { RoleDetails } from '@river/web3'
/**
 * Convience function to get space role details.
 */

export function useRoleDetails(spaceId: string, roleId: number) {
    const { client } = useZionContext()
    const isEnabled = spaceId.length > 0 && roleId >= 0

    const getRole = useCallback(
        async function () {
            if (!client || !isEnabled) {
                return undefined
            }
            const role = await client.spaceDapp.getRole(spaceId, roleId)
            return role
        },
        [client, isEnabled, roleId, spaceId],
    )

    const {
        isLoading,
        data: roleDetails,
        error,
    } = useQuery(
        blockchainKeys.roleDetails(spaceId, roleId),
        getRole,
        // options for the query.
        {
            enabled: isEnabled,
            refetchOnMount: true,
        },
    )

    return {
        isLoading,
        roleDetails,
        error,
    }
}

export function useMultipleRoleDetails(spaceId: string, roleIds: number[]) {
    const queryClient = useQueryClient()
    const { client } = useZionContext()
    const isEnabled = client && spaceId.length > 0 && roleIds.length > 0

    const getRoles = useCallback(
        async function (): Promise<RoleDetails[]> {
            if (!client) {
                return []
            }

            const getRolePromises: Promise<RoleDetails | null>[] = []
            for (const roleId of roleIds) {
                getRolePromises.push(client.spaceDapp.getRole(spaceId, roleId))
            }
            const roles = await Promise.all(getRolePromises)
            return roles.filter((role) => role !== null) as RoleDetails[]
        },
        [client, roleIds, spaceId],
    )

    const queryData = useQuery<RoleDetails[]>(
        blockchainKeys.multipleRoleDetails(spaceId, roleIds),
        getRoles,
        // options for the query.
        {
            enabled: isEnabled,
            refetchOnMount: true,
        },
    )

    const invalidateQuery = useCallback(
        () => queryClient.invalidateQueries(blockchainKeys.multipleRoleDetails(spaceId)),
        [queryClient, spaceId],
    )

    return {
        data: queryData.data,
        isLoading: queryData.isLoading,
        invalidateQuery,
    }
}
