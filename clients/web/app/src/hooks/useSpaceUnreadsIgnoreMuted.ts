import { Mute, UserSettings } from '@push-notification-worker/types'
import { useZionContext } from 'use-zion-client'
import { useMemo } from 'react'
import { useGetNotificationSettings } from 'api/lib/notificationSettings'

function showUnreadBadge(
    spaceUnreadChannelIds: Record<string, string[]>,
    userSettings?: UserSettings,
    spaceId?: string,
) {
    // if the space is muted, or if there is no spaceId, we can short circuit here
    if (
        !userSettings ||
        userSettings.spaceSettings.some(
            (spaceSetting) =>
                spaceSetting.spaceId === spaceId && spaceSetting.spaceMute === Mute.Muted,
        ) ||
        !spaceId
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
            .filter((space) => space.id.networkId !== ignoredSpaceId)
            .some((space) => {
                return showUnreadBadge(spaceUnreadChannelIds, data, space.id.networkId)
            })
    }, [spaceUnreadChannelIds, data, ignoredSpaceId, spaces])
}
