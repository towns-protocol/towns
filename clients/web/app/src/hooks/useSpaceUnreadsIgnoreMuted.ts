import { Mute, UserSettings } from '@push-notification-worker/types'
import { useFullyReadMarkerStore, useSpaceId, useZionContext } from 'use-zion-client'
import { useMemo } from 'react'
import { useGetNotificationSettings } from 'api/lib/notificationSettings'
import { useSpaceChannels } from './useSpaceChannels'

function showUnreadBadge(
    spaceUnreadChannelIds: Record<string, string[]>,
    userSettings?: UserSettings,
    spaceId?: string,
) {
    // if the space is muted, or if there is no spaceId, we can short circuit here
    if (
        !spaceId ||
        !spaceUnreadChannelIds[spaceId] ||
        !userSettings ||
        userSettings.spaceSettings.some(
            (spaceSetting) =>
                spaceSetting.spaceId === spaceId && spaceSetting.spaceMute === Mute.Muted,
        )
    ) {
        return false
    }

    const mutedChannelIds = new Set(
        userSettings.channelSettings
            .filter((c) => c.channelMute === Mute.Muted)
            .map((c) => c.channelId),
    )

    return spaceUnreadChannelIds[spaceId].some(
        (unreadChannel) => !mutedChannelIds.has(unreadChannel),
    )
}

export const useShowHasUnreadBadgeForSpaceId = (spaceId?: string) => {
    const { data } = useGetNotificationSettings()
    const { spaceUnreadChannelIds } = useZionContext()
    return useMemo(() => {
        return showUnreadBadge(spaceUnreadChannelIds, data, spaceId)
    }, [spaceUnreadChannelIds, data, spaceId])
}

/**
 * This hook returns a general "has unread" status, while ignoring a specific space.
 * useful for displaying a badge for "do i have unreads in any spaces except this one?"
 */
export const useShowHasUnreadBadgeForOtherSpaces = (ignoredSpaceId?: string) => {
    const { data } = useGetNotificationSettings()
    const { spaces, spaceUnreadChannelIds } = useZionContext()
    return useMemo(() => {
        return spaces
            .filter((space) => space.id.streamId !== ignoredSpaceId)
            .some((space) => {
                return showUnreadBadge(spaceUnreadChannelIds, data, space.id.streamId)
            })
    }, [spaceUnreadChannelIds, data, ignoredSpaceId, spaces])
}

// The hook for badging the active space is slightly different. We need access to the
// space's channels in order to pluck out the correct channels from the fullyReadMarkers.
export const useShowHasUnreadBadgeForCurrentSpace = () => {
    const spaceId = useSpaceId()
    const channels = useSpaceChannels()
    const { data } = useGetNotificationSettings()
    const fullyReadMarkers = useFullyReadMarkerStore()

    const showHasUnreadBadgeForCurrentSpace = useMemo(() => {
        const mutedChannelIds = new Set(
            data?.channelSettings
                .filter((c) => c.channelMute === Mute.Muted)
                .map((c) => c.channelId) ?? [],
        )

        if (
            data?.spaceSettings.some(
                (spaceSetting) =>
                    spaceSetting.spaceId === spaceId?.streamId &&
                    spaceSetting.spaceMute === Mute.Muted,
            )
        ) {
            return false
        }

        for (const channel of channels) {
            if (fullyReadMarkers.markers[channel.id.streamId]?.isUnread) {
                if (!mutedChannelIds.has(channel.id.streamId)) {
                    return true
                }
            }
        }
        return false
    }, [channels, data, fullyReadMarkers, spaceId])
    return { showHasUnreadBadgeForCurrentSpace }
}
