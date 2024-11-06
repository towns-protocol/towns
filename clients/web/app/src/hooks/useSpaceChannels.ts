import { useMemo } from 'react'
import { Channel, useSpaceData } from 'use-towns-client'

/**
 * includes all channels for a space
 * for joined only channels, see useMyChannels in lib
 */
export const useSpaceChannels = (): Channel[] => {
    const spaceData = useSpaceData()
    return useMemo(
        () =>
            spaceData?.channelGroups
                ? spaceData?.channelGroups.flatMap((cg) => cg.channels).filter((c) => !c.disabled)
                : [],
        [spaceData?.channelGroups],
    )
}
