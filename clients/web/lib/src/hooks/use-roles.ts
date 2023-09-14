import { useCallback, useEffect } from 'react'
import { useQuery, useQueryClient } from '../query/queryClient'

import { blockchainKeys } from '../query/query-keys'
import { useZionContext } from '../components/ZionContextProvider'
import { getFilteredRolesFromSpace } from '@river/web3'

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
            return await getFilteredRolesFromSpace(client.spaceDapp, spaceId)
        },
        [client, spaceId],
    )

    useEffect(
        function () {
            const prefetchRoles = async function () {
                if (spaceId) {
                    await queryClient.prefetchQuery({
                        queryKey: blockchainKeys.roles(spaceId),
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
        blockchainKeys.roles(spaceId),
        getRolesFromSpace,
        // options for the query.
        // query will not execute until the spaceId is defined.
        {
            enabled: spaceId.length > 0,
            refetchOnMount: true,
        },
    )

    return {
        isLoading,
        spaceRoles,
        error,
    }
}
