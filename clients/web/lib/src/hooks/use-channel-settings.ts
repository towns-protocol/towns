import { Permission } from 'client/web3/ContractTypes'
import { QueryKeyRoles } from './query-keys'
import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useZionClient } from './use-zion-client'

export function useChannelSettings(spaceId: string, channelId: string) {
    const { spaceDapp } = useZionClient()
    const isEnabled = spaceId.length > 0 && channelId.length > 0

    const getChannelSettings = useCallback(
        async (spaceId: string, channelId: string) => {
            if (spaceDapp) {
                const channelDetails = await spaceDapp.getChannelDetails(spaceId, channelId)
                if (channelDetails) {
                    // hide the owner role from the UI
                    channelDetails.roles = channelDetails.roles.filter(
                        (role) => role.name.toLowerCase() !== Permission.Owner.toLowerCase(),
                    )
                }
                return channelDetails
            }
            return null
        },
        [spaceDapp],
    )

    const {
        isLoading,
        data: channelSettings,
        error,
    } = useQuery(
        // unique keys per query so that React Query
        // can manage the cache for us.
        [QueryKeyRoles.BySpaceId, spaceId, QueryKeyRoles.ByChannelId, channelId],
        // query that does the data fetching.
        () => getChannelSettings(spaceId, channelId),
        // options for the query.
        {
            // query will not execute until the flag is true.
            enabled: isEnabled,
        },
    )

    return {
        isLoading,
        channelSettings,
        error,
    }
}
