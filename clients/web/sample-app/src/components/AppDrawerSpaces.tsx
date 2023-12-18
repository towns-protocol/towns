import { Divider, List, ListItem, ListItemText } from '@mui/material'
import {
    Channel,
    RoomIdentifier,
    SpaceItem,
    toRoomIdentifier,
    useChannelNotificationCounts,
    useSpaceData,
    useSpaceNotificationCounts,
    useSpaceThreadRootsUnreadCount,
    useZionContext,
} from 'use-zion-client'

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
                        key={s.id.streamId}
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
        return id.streamId === selectedSpaceId?.streamId
    }
    const spaceNotifications = useSpaceNotificationCounts(space.id)
    const spaceData = useSpaceData(space.id)
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
        <ListItem button key={space.id.streamId} onClick={() => onClickSpace(space.id)}>
            <ListItemText>
                {formatNameWithUnreads(space)}
                {isSelectedSpace(space.id) && spaceData && (
                    <List>
                        <ListItem
                            button
                            selected={false}
                            key={space.id.streamId + '_threads'}
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
                            key={space.id.streamId + '_mentions'}
                            onClick={(e) => {
                                e.stopPropagation()
                                onClickMentions(space.id)
                            }}
                        >
                            Mentions
                        </ListItem>
                        <Divider key={space.id.streamId + '_threadsDivider'} />
                        {spaceData?.channelGroups.at(0)?.channels.map((c) => (
                            <ChannelListItem
                                key={c.id.streamId}
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
    channel: Channel
    selectedChannelId?: RoomIdentifier
    onClickChannel: (spaceId: RoomIdentifier, channelId: RoomIdentifier) => void
}) => {
    const { spaceId, channel, selectedChannelId, onClickChannel } = props
    const isSelectedChannel = (id: RoomIdentifier) => {
        return id.streamId === selectedChannelId?.streamId
    }
    const channelNotifications = useChannelNotificationCounts(channel.id)
    const formatChannelNameWithUnreads = useCallback(
        (channel: Channel) => {
            const isUnread = channelNotifications.isUnread
            const mentionCount = channelNotifications.mentions
            const unreadPostfix = isUnread ? ' *' : ''
            const mentionPostfix = mentionCount > 0 ? ` (${mentionCount})` : ''
            return `${channel.label}${unreadPostfix}${mentionPostfix}`
        },
        [channelNotifications],
    )
    return (
        <ListItem
            button
            selected={isSelectedChannel(channel.id)}
            key={channel.id.streamId}
            onClick={(e) => {
                e.stopPropagation()
                onClickChannel(spaceId, channel.id)
            }}
        >
            {formatChannelNameWithUnreads(channel)}
        </ListItem>
    )
}
