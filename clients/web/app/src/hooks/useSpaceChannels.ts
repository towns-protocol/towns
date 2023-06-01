import { useMemo } from 'react'
import { Channel, useSpaceData } from 'use-zion-client'

export const useSpaceChannels = (): Channel[] => {
    const spaceData = useSpaceData()
    return useMemo(
        () =>
            spaceData?.channelGroups ? spaceData?.channelGroups.flatMap((cg) => cg.channels) : [],
        [spaceData?.channelGroups],
    )
}
