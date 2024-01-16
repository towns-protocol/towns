import { useMemo, useRef } from 'react'
import {
    Channel,
    DMChannelIdentifier,
    RoomMember,
    useMyChannels,
    useSpaceData,
    useSpaceMembers,
    useSpaceMentions,
    useZionContext,
} from 'use-zion-client'
import { isEqual } from 'lodash'
import { notUndefined } from 'ui/utils/utils'
import { useSpaceChannels } from './useSpaceChannels'

type Params = { spaceId: string; currentRouteId?: string }

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
}

export type DMChannelMenuItem = {
    type: 'dm'
    channel: DMChannelIdentifier
    id: string
    label: string
    latestMs: number
    search: string
    unread: boolean
}

export type MixedChannelMenuItem = ChannelMenuItem | DMChannelMenuItem

/**
 * maps channel and dm data to a unified format for use in the channel menu
 */
export const useSortedChannels = ({ spaceId, currentRouteId }: Params) => {
    const { spaceUnreadChannelIds, dmUnreadChannelIds, dmChannels, rooms } = useZionContext()
    const mentions = useSpaceMentions()
    const channels = useSpaceChannels()
    const { memberIds } = useSpaceMembers()
    const { joinedChannels } = useJoinedChannels(spaceId)
    const unreadChannelIds = spaceUnreadChannelIds[spaceId]

    // - - - - - - - - - - - - - - - - - - - - - - - - - collect and map channels

    const channelItems: ChannelMenuItem[] = useMemo(() => {
        return channels
            .map((channel) => {
                const mentionCount = mentions.reduce(
                    (count, m) =>
                        m.unread && !m.thread && m.channel.id === channel.id ? count + 1 : count,
                    0,
                )
                return channel
                    ? ({
                          type: 'channel',
                          id: channel.id,
                          label: channel.label,
                          search: channel.label,
                          channel,
                          mentionCount,
                          unread: !!unreadChannelIds?.has(channel.id),
                          joined: !!joinedChannels?.has(channel.id),
                          latestMs: Number(0),
                      } as const)
                    : undefined
            })
            .filter(notUndefined)
    }, [channels, joinedChannels, mentions, unreadChannelIds])

    // - - - - - - - - - - - - - - - - - - - - - - - - - collect and map all dms

    const dmItemsRef = useRef<DMChannelMenuItem[]>([])

    const dmItems = useMemo(() => {
        const spaceMembers = rooms[spaceId]?.members
        const value = Array.from(dmChannels)
            .filter((c) => !c.left && c.userIds.every((m) => memberIds.includes(m)))
            .map((channel) => {
                const roomMembers = rooms[channel.id]?.members
                return channel
                    ? ({
                          type: 'dm',
                          id: channel.id,
                          label: channel.properties?.name ?? '',
                          search: channel.userIds
                              .map((u) => mapMember(spaceMembers, roomMembers, u))
                              .join(),
                          channel,
                          unread: dmUnreadChannelIds.has(channel.id),
                          latestMs: Number(channel?.lastEventCreatedAtEpocMs ?? 0),
                      } satisfies DMChannelMenuItem)
                    : undefined
            })
            .filter(notUndefined)

        dmItemsRef.current = isEqual(value, dmItemsRef.current) ? dmItemsRef.current : value

        return dmItemsRef.current
    }, [dmChannels, dmUnreadChannelIds, memberIds, rooms, spaceId])

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
                (c) => (c.unread && joinedChannels.has(c.id)) || c.channel.id === persistUnreadId,
            ),
            ...dmItems.filter((c) => c.unread || c.channel.id === persistUnreadId),
        ].sort((a, b) => Math.sign(b.latestMs - a.latestMs))

        unreadChannelsRef.current = isEqual(value, unreadChannelsRef.current)
            ? unreadChannelsRef.current
            : value

        return unreadChannelsRef.current
    }, [channelItems, dmItems, joinedChannels, persistUnreadId])

    // - - - - - - - - - - - - - - - - - - - collect read channels sorted by name

    const readChannels = useMemo(() => {
        return [
            ...channelItems.filter(
                (c) => !c.unread && joinedChannels.has(c.id) && persistUnreadId !== c.id,
            ),
        ].sort((a, b) => a.channel.label.localeCompare(b.channel.label))
    }, [channelItems, joinedChannels, persistUnreadId])

    // - - - - - - - - - - - - - - - - - - - - - collect read dms sorted by date

    const readDMsRef = useRef<DMChannelMenuItem[]>([])
    const readDms = useMemo(() => {
        const value = [...dmItems.filter((c) => !c.unread && persistUnreadId !== c.id)].sort(
            (a, b) => Math.sign(b.latestMs - a.latestMs),
        )
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
        readChannels,
        readDms,
        unreadChannels,
        unjoinedChannels,
    }
}

const useJoinedChannels = (spaceId: string) => {
    const space = useSpaceData(spaceId)
    const myChannelGroups = useMyChannels(space)
    const joinedChannels = useMemo(
        () => new Set(myChannelGroups.flatMap((g) => g.channels).map((c) => c.id)),
        [myChannelGroups],
    )

    return {
        joinedChannels,
    }
}

const mapMember = (
    spaceMembers: RoomMember[] | undefined,
    roomMembers: RoomMember[] | undefined,
    userId: string,
) => {
    const member = spaceMembers?.find((m) => m.userId === userId)
    const roomMember = roomMembers?.find((m) => m.userId === userId)
    return member
        ? [roomMember?.displayName || member.displayName, roomMember?.username || member.username]
              .filter(notUndefined)
              .join()
        : ``
}
