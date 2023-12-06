import { useMemo } from 'react'
import {
    useFullyReadMarkerStore,
    useMyChannels,
    useSpaceData,
    useSpaceMentions,
} from 'use-zion-client'
import { Mute } from '@push-notification-worker/types'
import { useGetNotificationSettings } from 'api/lib/notificationSettings'

import { useSpaceChannels } from './useSpaceChannels'

export const useChannelsWithMentionCountsAndUnread = () => {
    const space = useSpaceData()
    const mentions = useSpaceMentions()

    const channels = useSpaceChannels()
    const myChannelGroups = useMyChannels(space)
    const joinedChannels = useMemo(
        () => myChannelGroups.flatMap((g) => g.channels),
        [myChannelGroups],
    )

    const { data } = useGetNotificationSettings()
    const fullyReadMarkers = useFullyReadMarkerStore()

    const mutedChannelIds = useMemo(() => {
        return new Set(
            data?.channelSettings
                .filter((c) => c.channelMute === Mute.Muted)
                .map((c) => c.channelId) ?? [],
        )
    }, [data])

    const spaceIsMuted = useMemo(() => {
        return (
            data?.spaceSettings.some(
                (spaceSetting) =>
                    spaceSetting.spaceId === space?.id.networkId &&
                    spaceSetting.spaceMute === Mute.Muted,
            ) ?? false
        )
    }, [data, space?.id.networkId])

    const mentionCountsPerChannel = useMemo(() => {
        const filteredMentions = mentions.filter((m) => m.unread && !m.thread)
        const grouped = filteredMentions.reduce((agg, m) => {
            return agg.set(m.channel.id.networkId, (agg.get(m.channel.id.networkId) ?? 0) + 1)
        }, new Map<string, number>())
        return grouped
    }, [mentions])

    const channelsWithMentionCountsAndUnread = useMemo(() => {
        return channels
            .map((c) => {
                const channelId = c.id.networkId
                return {
                    ...c,
                    isJoined: joinedChannels.some((mc) => mc.id.networkId === channelId),
                    mentionCount: mentionCountsPerChannel.get(channelId) ?? 0,
                    unread:
                        fullyReadMarkers.markers[channelId]?.isUnread &&
                        !mutedChannelIds.has(channelId) &&
                        !spaceIsMuted,
                    muted: mutedChannelIds.has(channelId) || spaceIsMuted,
                }
            })
            .sort((a, b) => a.label.localeCompare(b.label))
    }, [
        channels,
        joinedChannels,
        mentionCountsPerChannel,
        fullyReadMarkers.markers,
        mutedChannelIds,
        spaceIsMuted,
    ])

    return { channelsWithMentionCountsAndUnread }
}
