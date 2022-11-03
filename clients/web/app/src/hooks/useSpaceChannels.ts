import { Channel, useSpaceData } from 'use-zion-client'

export const useSpaceChannels = (): Channel[] => {
    const spaceData = useSpaceData()
    return spaceData ? spaceData?.channelGroups.flatMap((cg) => cg.channels) : []
}
