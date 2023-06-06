import { useMemo } from 'react'
import { useSpaceData } from 'use-zion-client'

export const useHasJoinedChannels = () => {
    const spaceData = useSpaceData()
    return useMemo(() => {
        return {
            loadingChannels: spaceData?.isLoadingChannels,
            hasJoinedChannels: Boolean(
                spaceData?.channelGroups?.flatMap((g) => g.channels).length ?? 0,
            ),
        }
    }, [spaceData?.channelGroups, spaceData?.isLoadingChannels])
}
