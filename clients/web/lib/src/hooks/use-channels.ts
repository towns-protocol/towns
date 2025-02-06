import { useMemo } from 'react'
import { useSpaceData } from './use-space-data'
import { Channel, ChannelGroup } from '../types/towns-types'

const EMPTY_CHANNELS: Channel[] = []

export function useChannels() {
    const data = useSpaceData()
    // flatmap channels
    return useMemo(() => {
        return data?.channelGroups ? getChannelsFromSpaceData(data.channelGroups) : EMPTY_CHANNELS
    }, [data?.channelGroups])
}

export function getChannelsFromSpaceData(channelGroups: ChannelGroup[]) {
    return channelGroups.reduce((channels, group) => {
        return [...channels, ...group.channels]
    }, [] as Channel[])
}
