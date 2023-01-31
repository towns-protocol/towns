import { getFilteredRolesFromSpace } from '../client/web3/ContractHelpers'
import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useZionContext } from '../components/ZionContextProvider'

/**
 * Convience function to get space roles.
 */

export function useRoles(_spaceId: string | undefined) {
    const spaceId = _spaceId && _spaceId.length > 0 ? _spaceId : ''
    const { client } = useZionContext()

    // function to get the roles for any space.
    const getRolesFromSpace = useCallback(
        async function (networkId: string) {
            if (!client || !networkId) {
                return undefined
            }
            return await getFilteredRolesFromSpace(client, networkId)
        },
        [client],
    )

    const {
        isLoading,
        data: spaceRoles,
        error,
    } = useQuery(
        // unique key per query so that React Query
        // can manage the cache for us.
        ['spaceRoles', spaceId],
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
