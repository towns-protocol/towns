import { Divider, List, ListItem, ListItemText } from '@mui/material'
import {
    RoomIdentifier,
    toRoomIdentifier,
    useChannelNotificationCounts,
    useSpaceHierarchy,
    useSpaceNotificationCounts,
    useSpaceThreadRootsUnreadCount,
    useZionContext,
} from 'use-zion-client'

import { SpaceChild, SpaceItem } from 'use-zion-client/dist/types/matrix-types'
import React, { useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'

interface Props {
    onClickSpace: (id: RoomIdentifier) => void
    onClickThreads: (spaceId: RoomIdentifier) => void
    onClickMentions: (spaceId: RoomIdentifier) => void
    onClickChannel: (spaceId: RoomIdentifier, channelId: RoomIdentifier) => void
}

export function AppDrawerSpaces(props: Props): JSX.Element {
    const { spaceSlug, channelSlug } = useParams()
    const { onClickSpace, onClickChannel, onClickThreads, onClickMentions } = props
    const { spaces } = useZionContext()

    const selectedSpaceId = useMemo(() => toRoomIdentifier(spaceSlug), [spaceSlug])
    const selectedChannelId = useMemo(() => toRoomIdentifier(channelSlug), [channelSlug])
    return (
        <>
            <List>
                {spaces.map((s) => (
                    <SpaceListItem
                        key={s.id.slug}
                        space={s}
                        selectedSpaceId={selectedSpaceId}
                        selectedChannelId={selectedChannelId}
                        onClickSpace={onClickSpace}
                        onClickThreads={onClickThreads}
                        onClickMentions={onClickMentions}
                        onClickChannel={onClickChannel}
                    />
                ))}
            </List>
        </>
    )
}

const SpaceListItem = (props: {
    space: SpaceItem
    selectedSpaceId?: RoomIdentifier
    selectedChannelId?: RoomIdentifier
    onClickSpace: (id: RoomIdentifier) => void
    onClickThreads: (id: RoomIdentifier) => void
    onClickMentions: (id: RoomIdentifier) => void
    onClickChannel: (spaceId: RoomIdentifier, channelId: RoomIdentifier) => void
}) => {
    const {
        space,
        selectedSpaceId,
        selectedChannelId,
        onClickSpace,
        onClickThreads,
        onClickMentions,
        onClickChannel,
    } = props
    const isSelectedSpace = (id: RoomIdentifier) => {
        return id.networkId === selectedSpaceId?.networkId
    }
    const spaceNotifications = useSpaceNotificationCounts(space.id)
    const spaceHierarchy = useSpaceHierarchy(space.id)
    const spaceThreadCount = useSpaceThreadRootsUnreadCount()
    const formatNameWithUnreads = useCallback(
        (space: SpaceItem) => {
            const unreadPostfix = spaceNotifications.isUnread ? ' *' : ''
            const mentionPostfix =
                spaceNotifications.mentions > 0 ? ` (${spaceNotifications.mentions})` : ''
            return `${space.name}${unreadPostfix}${mentionPostfix}`
        },
        [spaceNotifications],
    )
    return (
        <ListItem button key={space.id.slug} onClick={() => onClickSpace(space.id)}>
            <ListItemText>
                {formatNameWithUnreads(space)}
                {isSelectedSpace(space.id) && spaceHierarchy && (
                    <List>
                        <ListItem
                            button
                            selected={false}
                            key={space.id.slug + '_threads'}
                            onClick={(e) => {
                                e.stopPropagation()
                                onClickThreads(space.id)
                            }}
                        >
                            Threads {spaceThreadCount > 0 && `(${spaceThreadCount})`}
                        </ListItem>
                        <ListItem
                            button
                            selected={false}
                            key={space.id.slug + '_mentions'}
                            onClick={(e) => {
                                e.stopPropagation()
                                onClickMentions(space.id)
                            }}
                        >
                            Mentions
                        </ListItem>
                        <Divider key={space.id.slug + '_threadsDivider'} />
                        {spaceHierarchy.children.map((c) => (
                            <ChannelListItem
                                key={c.id.slug}
                                spaceId={space.id}
                                channel={c}
                                selectedChannelId={selectedChannelId}
                                onClickChannel={onClickChannel}
                            />
                        ))}
                    </List>
                )}
            </ListItemText>
        </ListItem>
    )
}

const ChannelListItem = (props: {
    spaceId: RoomIdentifier
    channel: SpaceChild
    selectedChannelId?: RoomIdentifier
    onClickChannel: (spaceId: RoomIdentifier, channelId: RoomIdentifier) => void
}) => {
    const { spaceId, channel, selectedChannelId, onClickChannel } = props
    const isSelectedChannel = (id: RoomIdentifier) => {
        return id.networkId === selectedChannelId?.networkId
    }
    const channelNotifications = useChannelNotificationCounts(channel.id)
    const formatChannelNameWithUnreads = useCallback(
        (channel: SpaceChild) => {
            const isUnread = channelNotifications.isUnread
            const mentionCount = channelNotifications.mentions
            const unreadPostfix = isUnread ? ' *' : ''
            const mentionPostfix = mentionCount > 0 ? ` (${mentionCount})` : ''
            return `${channel.name}${unreadPostfix}${mentionPostfix}`
        },
        [channelNotifications],
    )
    return (
        <ListItem
            button
            selected={isSelectedChannel(channel.id)}
            key={channel.id.slug}
            onClick={(e) => {
                e.stopPropagation()
                onClickChannel(spaceId, channel.id)
            }}
        >
            {formatChannelNameWithUnreads(channel)}
        </ListItem>
    )
}
