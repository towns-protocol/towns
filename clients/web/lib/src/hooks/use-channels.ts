import { useMemo } from 'react'
import { useSpaceData } from './use-space-data'
import { Channel } from '../types/matrix-types'

export function useChannels() {
    // this would be much more effecient if it was saved off in the useMatrixTimelines hook...
    const data = useSpaceData()

    // flatmap channels
    return useMemo(() => {
        const channels = data?.channelGroups.reduce((channels, group) => {
            return [...channels, ...group.channels]
        }, [] as Channel[])
        return channels ?? []
    }, [data?.channelGroups])
}
