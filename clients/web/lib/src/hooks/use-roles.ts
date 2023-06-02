import { useCallback, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { QueryRoleKeys } from './query-keys'
import { getFilteredRolesFromSpace } from '../client/web3/ContractHelpers'
import { useZionContext } from '../components/ZionContextProvider'

/**
 * Convience function to get space roles.
 */
export function useRoles(_spaceId: string | undefined) {
    const spaceId = _spaceId && _spaceId.length > 0 ? _spaceId : ''
    const queryClient = useQueryClient()
    const { client } = useZionContext()

    // function to get the roles for any space.
    const getRolesFromSpace = useCallback(
        async function (spaceNetworkId: string) {
            if (!client || !spaceNetworkId) {
                return undefined
            }
            return await getFilteredRolesFromSpace(client, spaceNetworkId)
        },
        [client],
    )

    useEffect(
        function () {
            const prefetchRoles = async function () {
                if (spaceId) {
                    await queryClient.prefetchQuery({
                        queryKey: [QueryRoleKeys.FirstBySpaceIds, spaceId],
                        queryFn: () => getRolesFromSpace(spaceId),
                        staleTime: 10 * 1000, // only prefetch if older than 10 seconds
                    })
                }
            }
            void prefetchRoles()
        },
        [getRolesFromSpace, queryClient, spaceId],
    )

    const {
        isLoading,
        data: spaceRoles,
        error,
    } = useQuery(
        // unique key per query so that React Query
        // can manage the cache for us.
        [QueryRoleKeys.FirstBySpaceIds, spaceId],
        // query function that does the data fetching.
        () => getRolesFromSpace(spaceId),
        // options for the query.
        // query will not execute until the spaceId is defined.
        { enabled: spaceId.length > 0 },
    )

    return {
        isLoading,
        spaceRoles,
        error,
    }
}
