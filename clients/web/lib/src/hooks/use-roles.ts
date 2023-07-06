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
        async function () {
            if (!client || !spaceId) {
                return undefined
            }
            return await getFilteredRolesFromSpace(client, spaceId)
        },
        [client, spaceId],
    )

    useEffect(
        function () {
            const prefetchRoles = async function () {
                if (spaceId) {
                    await queryClient.prefetchQuery({
                        queryKey: [QueryRoleKeys.FirstBySpaceIds, spaceId],
                        queryFn: getRolesFromSpace,
                        staleTime: 15 * 1000, // only prefetch if older than 15 seconds
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
        [QueryRoleKeys.FirstBySpaceIds, spaceId],
        getRolesFromSpace,
        // options for the query.
        // query will not execute until the spaceId is defined.
        {
            enabled: spaceId.length > 0,
            staleTime: 1000 * 15,
            refetchOnReconnect: false,
            refetchOnWindowFocus: false,
        },
    )

    return {
        isLoading,
        spaceRoles,
        error,
    }
}
