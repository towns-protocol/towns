import { Divider, List, ListItem, ListItemText } from '@mui/material'
import {
    Channel,
    SpaceItem,
    toRoomIdentifier,
    useChannelNotificationCounts,
    useSpaceDataWithId,
    useSpaceNotificationCounts,
    useSpaceThreadRootsUnreadCount,
    useTownsContext,
} from 'use-towns-client'

import React, { useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'

interface Props {
    onClickSpace: (id: string) => void
    onClickThreads: (spaceId: string) => void
    onClickMentions: (spaceId: string) => void
    onClickChannel: (spaceId: string, channelId: string) => void
}

export function AppDrawerSpaces(props: Props): JSX.Element {
    const { spaceSlug, channelSlug } = useParams()
    const { onClickSpace, onClickChannel, onClickThreads, onClickMentions } = props
    const { spaces } = useTownsContext()

    const selectedSpaceId = useMemo(() => toRoomIdentifier(spaceSlug), [spaceSlug])
    const selectedChannelId = useMemo(() => toRoomIdentifier(channelSlug), [channelSlug])
    return (
        <>
            <List>
                {spaces.map((s) => (
                    <SpaceListItem
                        key={s.id}
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
    selectedSpaceId?: string
    selectedChannelId?: string
    onClickSpace: (id: string) => void
    onClickThreads: (id: string) => void
    onClickMentions: (id: string) => void
    onClickChannel: (spaceId: string, channelId: string) => void
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
    const isSelectedSpace = (id: string) => {
        return id === selectedSpaceId
    }
    const spaceNotifications = useSpaceNotificationCounts(space.id)
    const spaceData = useSpaceDataWithId(space.id)
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
        <ListItem button key={space.id} onClick={() => onClickSpace(space.id)}>
            <ListItemText>
                {formatNameWithUnreads(space)}
                {isSelectedSpace(space.id) && spaceData && (
                    <List>
                        <ListItem
                            button
                            selected={false}
                            key={space.id + '_threads'}
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
                            key={space.id + '_mentions'}
                            onClick={(e) => {
                                e.stopPropagation()
                                onClickMentions(space.id)
                            }}
                        >
                            Mentions
                        </ListItem>
                        <Divider key={space.id + '_threadsDivider'} />
                        {spaceData?.channelGroups.at(0)?.channels.map((c) => (
                            <ChannelListItem
                                key={c.id}
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
    spaceId: string
    channel: Channel
    selectedChannelId?: string
    onClickChannel: (spaceId: string, channelId: string) => void
}) => {
    const { spaceId, channel, selectedChannelId, onClickChannel } = props
    const isSelectedChannel = (id: string) => {
        return id === selectedChannelId
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
            key={channel.id}
            onClick={(e) => {
                e.stopPropagation()
                onClickChannel(spaceId, channel.id)
            }}
        >
            {formatChannelNameWithUnreads(channel)}
        </ListItem>
    )
}
