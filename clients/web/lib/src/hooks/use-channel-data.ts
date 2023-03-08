import { Channel, ChannelData } from '../types/zion-types'
import { useChannelContext } from '../components/ChannelContextProvider'
import { useMemo } from 'react'
import { useSpaceData } from './use-space-data'
import { useRoom } from './use-room'

export function useChannelData(): ChannelData {
    const { channelId, spaceId } = useChannelContext()
    const space = useSpaceData()

    const room = useRoom(channelId)

    const channelGroup = useMemo(
        () =>
            space?.channelGroups.find((g) => g.channels.find((c) => c.id.slug === channelId.slug)),
        [space?.channelGroups, channelId.slug],
    )

    const channel = useMemo(() => {
        const channelChild = channelGroup?.channels.find((c) => c.id.slug === channelId.slug)
        if (!channelChild) {
            return undefined
        }
        const channel: Channel = {
            id: channelChild.id,
            label: room?.name ?? channelChild.label,
            private: channelChild.private,
            highlight: channelChild.highlight,
            topic: room?.topic ?? channelChild.topic,
        }
        return channel
    }, [channelGroup?.channels, channelId.slug, room?.name, room?.topic])

    return useMemo(() => {
        return {
            spaceId,
            channelId,
            channel,
        }
    }, [channel, channelId, spaceId])
}
