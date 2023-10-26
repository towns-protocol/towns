import { Channel, ChannelData } from '../types/zion-types'
import { useChannelContext } from '../components/ChannelContextProvider'
import { useMemo } from 'react'
import { useSpaceData } from './use-space-data'
import { useRoom } from './use-room'
import { useParams } from 'react-router-dom'
import { isDMChannelStreamId } from '@river/sdk'

export function useChannelData(): ChannelData {
    const { channelId, spaceId } = useChannelContext()
    const space = useSpaceData()
    const { channelSlug } = useParams()
    const room = useRoom(channelId)

    const channelGroup = useMemo(
        () =>
            space?.channelGroups.find((g) => g.channels.find((c) => c.id.slug === channelId.slug)),
        [space?.channelGroups, channelId.slug],
    )

    const channel = useMemo(() => {
        const channelChild = channelGroup?.channels.find((c) => c.id.slug === channelId.slug)
        if (!channelChild) {
            // The channel wasn't found in a space, return a DM channel if the prefix matches
            if (channelSlug && isDMChannelStreamId(channelSlug)) {
                return {
                    id: channelId,
                    label: channelSlug,
                    private: true,
                    highlight: false,
                    topic: '',
                } satisfies Channel
            }
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
    }, [channelGroup?.channels, channelId, room?.name, room?.topic, channelSlug])
    return useMemo(() => {
        return {
            spaceId,
            channelId,
            channel,
        }
    }, [channel, channelId, spaceId])
}
