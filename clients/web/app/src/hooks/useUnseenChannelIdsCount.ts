import { useCallback, useMemo } from 'react'
import { useSpaceId } from 'use-towns-client'
import { useStore } from 'store/store'
import { useSpaceChannels } from './useSpaceChannels'
import { useJoinedChannels } from './useSortedChannels'

export const useUnseenChannelIds = () => {
    const spaceId = useSpaceId()
    const { seenChannelIds, setSeenChannelIds } = useStore()
    const allChannels = useSpaceChannels()
    const { joinedChannels } = useJoinedChannels(spaceId)

    const unseenChannelIds = useMemo(() => {
        const ids = new Set(seenChannelIds)
        const unseenIds = allChannels
            .filter((channel) => !joinedChannels.has(channel.id) && !ids.has(channel.id))
            .map((channel) => channel.id)
        return new Set<string>(unseenIds)
    }, [seenChannelIds, allChannels, joinedChannels])

    const markChannelsAsSeen = useCallback(() => {
        const ids = allChannels.map((channel) => channel.id)
        const allSeenChannelIds = new Set([...seenChannelIds, ...ids])
        setSeenChannelIds(Array.from(allSeenChannelIds))
    }, [seenChannelIds, setSeenChannelIds, allChannels])

    return { unseenChannelIds, markChannelsAsSeen }
}
