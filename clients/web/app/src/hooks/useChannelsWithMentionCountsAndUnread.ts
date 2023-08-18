import { useMemo } from 'react'
import { useSpaceData, useSpaceMentions, useZionContext } from 'use-zion-client'
import { Mute } from '@push-notification-worker/types'
import { useGetNotificationSettings } from 'api/lib/notificationSettings'
import { useContractChannelsWithJoinedStatus } from './useContractChannelsWithJoinedStatus'

export const useChannelsWithMentionCountsAndUnread = () => {
    const space = useSpaceData()
    const mentions = useSpaceMentions()
    const { contractChannelsWithJoinedStatus } = useContractChannelsWithJoinedStatus()
    const { spaceUnreadChannelIds } = useZionContext()
    const { data } = useGetNotificationSettings()

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
        const spaceId = space?.id.networkId ?? ''
        const unreadChannelIds = new Set(spaceUnreadChannelIds[spaceId] ?? [])
        return contractChannelsWithJoinedStatus
            .map((c) => {
                return {
                    ...c,
                    mentionCount: mentionCountsPerChannel.get(c.channelNetworkId) ?? 0,
                    unread:
                        unreadChannelIds.has(c.channelNetworkId) &&
                        !mutedChannelIds.has(c.channelNetworkId) &&
                        !spaceIsMuted,
                    muted: mutedChannelIds.has(c.channelNetworkId) || spaceIsMuted,
                }
            })
            .sort((a, b) => a.name.localeCompare(b.name))
    }, [
        contractChannelsWithJoinedStatus,
        mentionCountsPerChannel,
        space?.id.networkId,
        spaceUnreadChannelIds,
        mutedChannelIds,
        spaceIsMuted,
    ])
    return { channelsWithMentionCountsAndUnread }
}
