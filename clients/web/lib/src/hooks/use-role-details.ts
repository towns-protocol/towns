import { useCallback, useMemo } from 'react'
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'

import { QueryKeyRoles } from './query-keys'
import { RoleDetails } from '../client/web3/ContractTypes'
import { useZionContext } from '../components/ZionContextProvider'

/**
 * Convience function to get space role details.
 */

export function useRoleDetails(spaceId: string, roleId: number) {
    const { client } = useZionContext()
    const isEnabled = spaceId.length > 0 && roleId > 0

    const getRole = useCallback(
        async function (spaceId: string, roleId: number) {
            if (!client || !isEnabled) {
                return undefined
            }
            const role = await client.spaceDapp.getRole(spaceId, roleId)
            return role
        },
        [client, isEnabled],
    )

    const {
        isLoading,
        data: roleDetails,
        error,
    } = useQuery(
        // unique keys per query so that React Query
        // can manage the cache for us.
        [QueryKeyRoles.BySpaceId, spaceId, QueryKeyRoles.ByRoleId, roleId],
        // query that does the data fetching.
        () => getRole(spaceId, roleId),
        // options for the query.
        {
            // query will not execute until the flag is true.
            enabled: isEnabled,
        },
    )

    return {
        isLoading,
        roleDetails,
        error,
    }
}

export function useRoleDetailsByChannel(spaceId: string, channelId: string, roleId: number) {
    const { client } = useZionContext()
    const isEnabled = spaceId.length > 0 && roleId > 0 && channelId.length > 0

    const getRole = useCallback(
        async function (spaceId: string, roleId: number) {
            if (!client || !isEnabled) {
                return undefined
            }
            const role = await client.spaceDapp.getRole(spaceId, roleId)
            return role
        },
        [client, isEnabled],
    )

    const {
        isLoading,
        data: roleDetails,
        error,
    } = useQuery(
        // unique keys per query so that React Query
        // can manage the cache for us.
        [
            QueryKeyRoles.BySpaceId,
            spaceId,
            QueryKeyRoles.ByChannelId,
            channelId,
            QueryKeyRoles.ByRoleId,
            roleId,
        ],
        // query that does the data fetching.
        () => getRole(spaceId, roleId),
        // options for the query.
        {
            // query will not execute until the flag is true.
            enabled: isEnabled,
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

    const queryData = useQueries<RoleDetails[]>({
        queries: roleIds.map((roleId) => {
            return {
                queryKey: [QueryKeyRoles.BySpaceId, spaceId, QueryKeyRoles.ByRoleId, roleId],
                queryFn: () => getRole(spaceId, roleId),
                enabled: isEnabled,
                refetchOnWindowFocus: false,
                staleTime: 1000 * 60 * 5,
                cacheTime: 1000 * 60 * 10,
                retry: false,
            }
        }),
    })

    return useMemo(() => {
        const invalidateQuery = () =>
            queryClient.invalidateQueries([
                QueryKeyRoles.BySpaceId,
                spaceId,
                QueryKeyRoles.ByRoleId,
            ])

        if (!queryData.some((token) => token.isLoading)) {
            return {
                data: queryData
                    .map((token) => token.data)
                    .filter((data): data is RoleDetails => !!data),
                isLoading: false,
                invalidateQuery,
            }
        }

        return {
            data: undefined,
            isLoading: true,
            invalidateQuery,
        }
    }, [queryClient, queryData, spaceId])
}
