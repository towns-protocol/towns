import { Channel, ChannelData } from '../types/towns-types'
import { useChannelContext } from '../components/ChannelContextProvider'
import { useMemo } from 'react'
import { useSpaceDataWithId } from './use-space-data'
import {
    isChannelStreamId,
    isDMChannelStreamId,
    isGDMChannelStreamId,
    spaceIdFromChannelId,
} from '@towns-protocol/sdk'

export function useChannelData(): ChannelData {
    const { channelId, spaceId } = useChannelContext()
    const channel = useChannelWithSpaceId(channelId, spaceId)
    return useMemo(() => {
        return {
            spaceId,
            channelId,
            channel,
        }
    }, [channel, channelId, spaceId])
}

export function useChannelWithId(inChannelId?: string) {
    const channelId = inChannelId && isChannelStreamId(inChannelId) ? inChannelId : undefined
    const spaceId = channelId ? spaceIdFromChannelId(channelId) : undefined
    return useChannelWithSpaceId(channelId, spaceId)
}

function useChannelWithSpaceId(channelId?: string, spaceId?: string): Channel | undefined {
    const space = useSpaceDataWithId(spaceId)
    const channelGroup = useMemo(
        () => space?.channelGroups.find((g) => g.channels.find((c) => c.id === channelId)),
        [space?.channelGroups, channelId],
    )

    return useMemo(() => {
        if (!channelId) {
            return undefined
        }
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
                    isAutojoin: false,
                    isDefault: false,
                    hideUserJoinLeaveEvents: false,
                    disabled: false,
                } satisfies Channel
            }
            return undefined
        }

        const channel: Channel = {
            id: channelChild.id,
            label: channelChild.label,
            private: channelChild.private,
            highlight: channelChild.highlight,
            topic: channelChild.topic,
            isAutojoin: channelChild.isAutojoin,
            isDefault: channelChild.isDefault,
            hideUserJoinLeaveEvents: channelChild.hideUserJoinLeaveEvents,
            disabled: channelChild.disabled,
        }
        return channel
    }, [channelGroup?.channels, channelId])
}
