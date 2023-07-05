import { Permission } from 'client/web3/ContractTypes'
import { QueryRoleKeys } from './query-keys'
import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useZionClient } from './use-zion-client'

export function useChannelSettings(spaceId: string, channelId: string) {
    const { spaceDapp } = useZionClient()
    const isEnabled = spaceId.length > 0 && channelId.length > 0

    const getChannelSettings = useCallback(
        async function () {
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
        [channelId, spaceDapp, spaceId],
    )

    const {
        isLoading,
        data: channelSettings,
        error,
    } = useQuery(
        [QueryRoleKeys.FirstBySpaceIds, spaceId, QueryRoleKeys.ThenByChannelIds, channelId],
        getChannelSettings,
        // options for the query.
        {
            // query will not execute until the flag is true.
            enabled: isEnabled,
            staleTime: 1000 * 15,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
        },
    )

    return {
        isLoading,
        channelSettings,
        error,
    }
}
