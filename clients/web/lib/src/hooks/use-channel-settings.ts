import { blockchainKeys } from '../query/query-keys'
import { useCallback } from 'react'
import { useQuery } from '../query/queryClient'
import { useZionClient } from './use-zion-client'

export function useChannelSettings(spaceId: string, channelId: string) {
    const { spaceDapp } = useZionClient()
    const isEnabled = spaceId.length > 0 && channelId.length > 0

    const getChannelSettings = useCallback(
        async function () {
            if (spaceDapp) {
                const channelDetails = await spaceDapp.getChannelDetails(spaceId, channelId)
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
        blockchainKeys.spaceAndChannel(spaceId, channelId),
        getChannelSettings,
        // options for the query.
        {
            // query will not execute until the flag is true.
            enabled: isEnabled,
            refetchOnMount: true,
        },
    )

    return {
        isLoading,
        channelSettings,
        error,
    }
}
