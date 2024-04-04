import { useCallback, useEffect } from 'react'
import { useQuery, useQueryClient } from '../query/queryClient'

import { blockchainKeys } from '../query/query-keys'
import { getFilteredRolesFromSpace } from '@river-build/web3'
import { useSpaceDapp } from './use-space-dapp'
import { useTownsContext } from '../components/TownsContextProvider'

/**
 * Convience function to get space roles.
 */
export function useRoles(_spaceId: string | undefined) {
    const spaceId = _spaceId && _spaceId.length > 0 ? _spaceId : ''
    const queryClient = useQueryClient()
    const { baseProvider: provider, baseConfig: config } = useTownsContext()

    const spaceDapp = useSpaceDapp({
        config,
        provider,
    })

    // function to get the roles for any space.
    const getRolesFromSpace = useCallback(
        async function () {
            if (!spaceDapp || !spaceId) {
                return undefined
            }
            return await getFilteredRolesFromSpace(spaceDapp, spaceId)
        },
        [spaceDapp, spaceId],
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
        },
    )

    return {
        isLoading,
        spaceRoles,
        error,
    }
}
