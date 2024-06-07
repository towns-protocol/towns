import { useMemo, useRef } from 'react'
import {
    Channel,
    DMChannelIdentifier,
    useMyChannels,
    useSpaceDataWithId,
    useSpaceMembers,
    useSpaceMentions,
    useTownsContext,
    useUserLookupStore,
} from 'use-towns-client'
import { isEqual } from 'lodash'
import { useMutedStreamIds } from 'api/lib/notificationSettings'
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
export const useSortedChannels = ({ spaceId, currentRouteId }: Params) => {
    const { spaceUnreadChannelIds, dmUnreadChannelIds, dmChannels } = useTownsContext()
    const mentions = useSpaceMentions()
    const channels = useSpaceChannels()
    const { memberIds } = useSpaceMembers()
    const { joinedChannels } = useJoinedChannels(spaceId)
    const { favoriteChannelIds } = useFavoriteChannels()
    const { mutedStreamIds } = useMutedStreamIds()

    const unreadChannelIds = useMemo(
        () => (spaceId ? spaceUnreadChannelIds[spaceId] : new Set()),
        [spaceId, spaceUnreadChannelIds],
    )

    // - - - - - - - - - - - - - - - - - - - - - - - - - collect and map channels

    const channelItems: ChannelMenuItem[] = useMemo(() => {
        return channels
            .map((channel) => {
                const mentionCount = mentions.reduce(
                    (count, m) =>
                        m.unread && !m.thread && m.channel.id === channel.id ? count + 1 : count,
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
    }, [channels, joinedChannels, mentions, unreadChannelIds, favoriteChannelIds, mutedStreamIds])

    // - - - - - - - - - - - - - - - - - - - - - - - - - collect and map all dms

    const dmItemsRef = useRef<DMChannelMenuItem[]>([])

    const dmItems = useMemo(() => {
        const value = Array.from(dmChannels)
            .filter((c) => !c.left && (!spaceId || c.userIds.every((m) => memberIds.includes(m))))
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
                    unread: dmUnreadChannelIds.has(channel.id),
                    isGroup: channel.isGroup,
                    latestMs: Number(channel?.lastEventCreatedAtEpochMs ?? 0),
                    favorite: favoriteChannelIds.has(channel.id),
                    muted: mutedStreamIds.has(channel.id),
                } satisfies DMChannelMenuItem
            })

        dmItemsRef.current = isEqual(value, dmItemsRef.current) ? dmItemsRef.current : value

        return dmItemsRef.current
    }, [dmChannels, dmUnreadChannelIds, memberIds, spaceId, favoriteChannelIds, mutedStreamIds])

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    // if the current route has become unread->read, we still want to keep it in
    // the menu as unread until the user navigates away from it

    const prevUnreads = useRef<string[]>([])

    const persistUnreadId =
        currentRouteId && prevUnreads.current.includes(currentRouteId) ? currentRouteId : undefined

    // - - - - - - - - - - - - - - - - - collect unread channels sorted by date

    const unreadChannelsRef = useRef<MixedChannelMenuItem[]>([])
    const unreadChannels = useMemo(() => {
        const value = [
            ...channelItems.filter(
                (c) =>
                    ((c.unread && joinedChannels.has(c.id)) ||
                        c.channel.id === persistUnreadId ||
                        prevUnreads.current.includes(c.id)) &&
                    !c.muted,
            ),
            ...dmItems.filter(
                (c) =>
                    c.unread ||
                    c.channel.id === persistUnreadId ||
                    prevUnreads.current.includes(c.channel.id),
            ),
        ].sort((a, b) => Math.sign(b.latestMs - a.latestMs))

        unreadChannelsRef.current = isEqual(value, unreadChannelsRef.current)
            ? unreadChannelsRef.current
            : value

        return unreadChannelsRef.current
    }, [channelItems, dmItems, joinedChannels, persistUnreadId])

    // - - - - - - - - - - - - - - - - - collect actual unread channels (not persisted)

    const actualUnreadChannelsRef = useRef<MixedChannelMenuItem[]>([])
    const actualUnreadChannels = useMemo(() => {
        const value = [
            ...channelItems.filter((c) => c.unread && joinedChannels.has(c.id)),
            ...dmItems.filter((c) => c.unread),
        ].sort((a, b) => Math.sign(b.latestMs - a.latestMs))

        actualUnreadChannelsRef.current = isEqual(value, actualUnreadChannelsRef.current)
            ? actualUnreadChannelsRef.current
            : value

        return actualUnreadChannelsRef.current
    }, [channelItems, dmItems, joinedChannels])

    // - - - - - - - - - - - - - - - - - - - collect read channels sorted by name

    const readChannels = useMemo(() => {
        return [
            ...channelItems.filter(
                (c) =>
                    !c.unread &&
                    joinedChannels.has(c.id) &&
                    persistUnreadId !== c.id &&
                    !prevUnreads.current.includes(c.id) &&
                    !c.favorite,
            ),
        ]
    }, [channelItems, joinedChannels, persistUnreadId])

    const favoriteChannels = useMemo(() => {
        return [
            ...channelItems.filter(
                (c) =>
                    c.favorite &&
                    !c.unread &&
                    persistUnreadId !== c.id &&
                    !prevUnreads.current.includes(c.id),
            ),
            ...dmItems.filter(
                (c) =>
                    c.favorite &&
                    !c.unread &&
                    persistUnreadId !== c.id &&
                    !prevUnreads.current.includes(c.id),
            ),
        ]
    }, [channelItems, dmItems, persistUnreadId])

    // - - - - - - - - - - - - - - - - - - - - - collect read dms sorted by date

    const readDMsRef = useRef<DMChannelMenuItem[]>([])
    const readDms = useMemo(() => {
        const value = [
            ...dmItems.filter(
                (c) =>
                    !c.unread &&
                    persistUnreadId !== c.id &&
                    !prevUnreads.current.includes(c.id) &&
                    !c.favorite,
            ),
        ].sort((a, b) => Math.sign(b.latestMs - a.latestMs))
        readDMsRef.current = isEqual(value, readDMsRef.current) ? readDMsRef.current : value
        return readDMsRef.current
    }, [dmItems, persistUnreadId])

    const unjoinedChannels = useMemo(() => {
        return channelItems.filter((c) => !c.joined)
    }, [channelItems])

    prevUnreads.current = useMemo(() => {
        const value = unreadChannels.map((u) => u.id)
        return isEqual(value, prevUnreads.current) ? prevUnreads.current : value
    }, [unreadChannels])

    return {
        favoriteChannels,
        actualUnreadChannels,
        readChannels,
        readDms,
        unreadChannels,
        unjoinedChannels,
        dmItems,
        channelItems,
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
