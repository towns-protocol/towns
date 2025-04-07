import { useMemo, useRef } from 'react'
import {
    Channel,
    DMChannelIdentifier,
    useMutedStreamIds,
    useMyChannels,
    useSpaceDataWithId,
    useSpaceMembers,
    useSpaceMentions,
    useTownsContext,
    useUserLookupStore,
} from 'use-towns-client'
import { isEqual } from 'lodash'
import { firstBy } from 'thenby'
import { useSpaceChannels } from './useSpaceChannels'
import { useFavoriteChannels } from './useFavoriteChannels'

type Params = { spaceId?: string; currentRouteId?: string }

export type ChannelMenuItem = {
    type: 'channel'
    id: string
    channel: Channel
    joined: boolean
    label: string
    latestMs: number
    mentionCount: number
    search: string
    unread: boolean
    favorite: boolean
    muted: boolean
}

export type DMChannelMenuItem = {
    type: 'dm'
    channel: DMChannelIdentifier
    id: string
    isGroup: boolean
    label: string
    latestMs: number
    search: string
    unread: boolean
    favorite: boolean
    muted: boolean
}

export type MixedChannelMenuItem = ChannelMenuItem | DMChannelMenuItem

/**
 * maps channel and dm data to a unified format for use in the channel menu
 */
export const useSortedChannels = ({ spaceId }: Params) => {
    const {
        spaceUnreadChannelIds: _unreadChannelIds,
        dmUnreadChannelIds: _dmUnreadChannelIds,
        dmChannels: _dmChannels,
    } = useTownsContext()
    const spaceMentions = useSpaceMentions(spaceId)
    const channels = useSpaceChannels()
    const { memberIds: spaceMemberIds } = useSpaceMembers()
    const { joinedChannels } = useJoinedChannels(spaceId)
    const { favoriteChannelIds } = useFavoriteChannels()
    const mutedStreamIds = useMutedStreamIds()

    const unreadChannelIds = useMemo(
        () => (spaceId ? _unreadChannelIds[spaceId] : new Set()),
        [spaceId, _unreadChannelIds],
    )

    // - - - - - - - - - - - - - - - - - - - - - - - - - collect and map channels

    const channelItems: ChannelMenuItem[] = useMemo(() => {
        return channels
            .map((channel) => {
                const mentionCount = spaceMentions.reduce(
                    (count, m) =>
                        m.unread && !m.thread && m.channelId === channel.id ? count + 1 : count,
                    0,
                )
                return {
                    type: 'channel',
                    id: channel.id,
                    label: channel.label,
                    search: channel.label,
                    channel,
                    mentionCount,
                    unread: !!unreadChannelIds?.has(channel.id),
                    joined: !!joinedChannels?.has(channel.id),
                    latestMs: Number(0),
                    favorite: favoriteChannelIds.has(channel.id),
                    muted: mutedStreamIds.has(channel.id),
                } satisfies ChannelMenuItem
            })
            .sort((a, b) => {
                if (a.muted !== b.muted) {
                    return a.muted ? 1 : -1
                }
                return a.channel.label.localeCompare(b.channel.label)
            })
    }, [
        channels,
        joinedChannels,
        spaceMentions,
        unreadChannelIds,
        favoriteChannelIds,
        mutedStreamIds,
    ])

    // - - - - - - - - - - - - - - - - - - - - - - - - - collect and map all dms

    const dmItemsRef = useRef<DMChannelMenuItem[]>([])
    const dmItems = useMemo(() => {
        const value = Array.from(_dmChannels)
            .filter(
                (c) => !c.left && (!spaceId || c.userIds.every((m) => spaceMemberIds.includes(m))),
            )
            .map((channel) => {
                return {
                    type: 'dm',
                    id: channel.id,
                    label: channel.properties?.name ?? '',
                    search: channel.userIds
                        // build search names imperatively
                        .map((u) => namesFromUserId(u, { spaceId, channelId: channel.id }))
                        .join(),
                    channel,
                    unread: _dmUnreadChannelIds.has(channel.id),
                    isGroup: channel.isGroup,
                    latestMs: Number(channel?.lastEventCreatedAtEpochMs ?? 0),
                    favorite: favoriteChannelIds.has(channel.id),
                    muted: mutedStreamIds.has(channel.id),
                } satisfies DMChannelMenuItem
            })

        dmItemsRef.current = isEqual(value, dmItemsRef.current) ? dmItemsRef.current : value

        return dmItemsRef.current
    }, [
        _dmChannels,
        _dmUnreadChannelIds,
        favoriteChannelIds,
        mutedStreamIds,
        spaceId,
        spaceMemberIds,
    ])

    const sortedSpaceChannelsRef = useRef<ChannelMenuItem[]>([])
    const sortedSpaceChannels = useMemo(() => {
        const channels = [
            ...channelItems
                .filter((c) => joinedChannels.has(c.id) && !c.favorite)
                .sort(firstBy((c) => c.mentionCount > 0, 'desc')),
        ]
        sortedSpaceChannelsRef.current = isEqual(channels, sortedSpaceChannelsRef.current)
            ? sortedSpaceChannelsRef.current
            : channels
        return sortedSpaceChannelsRef.current
    }, [channelItems, joinedChannels])

    const favoriteChannelListRef = useRef<(ChannelMenuItem | DMChannelMenuItem)[]>([])
    const sortedFavoriteChannels = useMemo(() => {
        const value = [
            ...channelItems.filter((c) => c.favorite),
            ...dmItems.filter((c) => c.favorite),
        ]
        favoriteChannelListRef.current = isEqual(value, favoriteChannelListRef.current)
            ? favoriteChannelListRef.current
            : value
        return favoriteChannelListRef.current
    }, [channelItems, dmItems])

    // - - - - - - - - - - - - - - - - - - - - - collect read dms sorted by date

    const sortedDmChannelsRef = useRef<DMChannelMenuItem[]>([])
    const sortedDmChannels = useMemo(() => {
        const value = [...dmItems.filter((c) => !c.favorite)].sort((a, b) =>
            Math.sign(b.latestMs - a.latestMs),
        )
        sortedDmChannelsRef.current = isEqual(value, sortedDmChannelsRef.current)
            ? sortedDmChannelsRef.current
            : value
        return sortedDmChannelsRef.current
    }, [dmItems])

    const unjoinedChannels = useMemo(() => {
        return channelItems.filter((c) => !c.joined)
    }, [channelItems])

    return {
        channelItems,
        dmItems,
        sortedDmChannels,
        sortedFavoriteChannels,
        sortedSpaceChannels,
        spaceMemberIds,
        spaceMentions,
        unjoinedChannels,
    }
}

export const useJoinedChannels = (spaceId: string | undefined) => {
    const space = useSpaceDataWithId(spaceId, 'useJoinedChannels')
    const myChannelGroups = useMyChannels(space)
    const joinedChannels = useMemo(
        () => new Set(myChannelGroups.flatMap((g) => g.channels).map((c) => c.id)),
        [myChannelGroups],
    )

    return {
        joinedChannels,
    }
}

const namesFromUserId = (
    userId: string,
    { spaceId, channelId }: { spaceId?: string; channelId?: string },
) => {
    const { allUsers, spaceUsers, channelUsers } = useUserLookupStore.getState()

    const displayName =
        channelUsers[channelId ?? '']?.[userId]?.displayName ||
        (spaceId
            ? spaceUsers[spaceId ?? '']?.[userId]?.displayName
            : // match all users when searching outside a space
              Object.values(allUsers[userId] ?? [])
                  .filter((s) => s.displayName)
                  .map((s) => s.displayName)
                  .join())

    const userName =
        channelUsers[channelId ?? '']?.[userId]?.userName ||
        (spaceId
            ? spaceUsers[spaceId ?? '']?.[userId]?.userName
            : // match all users when searching outside a space
              Object.values(allUsers[userId] ?? [])
                  .filter((s) => s.userName)
                  .map((s) => s.userName)
                  .join())

    return [displayName, userName].filter(Boolean).join(' ')
}
