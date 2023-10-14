import { useMemo } from 'react'
import { useSpaceData } from './use-space-data'
import { Channel } from '../types/zion-types'

export function useChannels() {
    const data = useSpaceData()
    // flatmap channels
    return useMemo(() => {
        const channels = data?.channelGroups.reduce((channels, group) => {
            return [...channels, ...group.channels]
        }, [] as Channel[])
        return channels ?? []
    }, [data?.channelGroups])
}
