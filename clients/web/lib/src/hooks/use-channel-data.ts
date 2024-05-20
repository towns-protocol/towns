import { Channel, ChannelData } from '../types/towns-types'
import { useChannelContext } from '../components/ChannelContextProvider'
import { useMemo } from 'react'
import { useSpaceData } from './use-space-data'
import { useRoom } from './use-room'
import { isDMChannelStreamId, isGDMChannelStreamId } from '@river/sdk'

export function useChannelData(): ChannelData {
    const { channelId, spaceId } = useChannelContext()
    const space = useSpaceData()

    const room = useRoom(channelId)
    const channelGroup = useMemo(
        () => space?.channelGroups.find((g) => g.channels.find((c) => c.id === channelId)),
        [space?.channelGroups, channelId],
    )

    const channel = useMemo(() => {
        const channelChild = channelGroup?.channels.find((c) => c.id === channelId)
        if (!channelChild) {
            // The channel wasn't found in a space, return a DM channel if the prefix matches
            if (isDMChannelStreamId(channelId) || isGDMChannelStreamId(channelId)) {
                return {
                    id: channelId,
                    label: '',
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
    }, [channelGroup?.channels, channelId, room?.name, room?.topic])
    return useMemo(() => {
        return {
            spaceId,
            channelId,
            channel,
        }
    }, [channel, channelId, spaceId])
}
