import { useMemo } from 'react'
import { useSpaceData } from 'use-towns-client'

export const useHasJoinedChannels = () => {
    const spaceData = useSpaceData()
    return useMemo(() => {
        return {
            loadingChannels: spaceData?.isLoadingChannels ?? true,
            hasJoinedChannels: Boolean(
                spaceData?.channelGroups?.flatMap((g) => g.channels).length ?? 0,
            ),
        }
    }, [spaceData?.channelGroups, spaceData?.isLoadingChannels])
}
