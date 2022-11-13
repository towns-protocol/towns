import { List, ListItem, ListItemText } from '@mui/material'
import { RoomIdentifier, toRoomIdentifier, useZionContext } from 'use-zion-client'

import { Theme } from '@mui/system'
import { SpaceChild, SpaceItem } from 'use-zion-client/dist/types/matrix-types'
import React, { useCallback } from 'react'
import { useParams } from 'react-router-dom'

interface Props {
    onClickSpace: (id: RoomIdentifier) => void
    onClickChannel: (spaceId: RoomIdentifier, channelId: RoomIdentifier) => void
}

export function AppDrawerSpaces(props: Props): JSX.Element {
    const { spaceSlug, channelSlug } = useParams()
    const { onClickSpace, onClickChannel } = props
    const {
        unreadCounts,
        mentionCounts,
        spaces,
        spaceHierarchies,
        spaceUnreads,
        spaceMentionCounts,
    } = useZionContext()
    const formatNameWithUnreads = useCallback(
        (space: SpaceItem) => {
            const unreadPostfix = spaceUnreads[space.id.matrixRoomId] === true ? ' *' : ''
            const mentionPostfix =
                spaceMentionCounts[space.id.matrixRoomId] > 0
                    ? ` (${spaceMentionCounts[space.id.matrixRoomId]})`
                    : ''
            return `${space.name}${unreadPostfix}${mentionPostfix}`
        },
        [spaceMentionCounts, spaceUnreads],
    )

    const formatChannelNameWithUnreads = useCallback(
        (channel: SpaceChild) => {
            const unreadCount = unreadCounts[channel.id.matrixRoomId] ?? 0
            const mentionCount = mentionCounts[channel.id.matrixRoomId] ?? 0
            const unreadPostfix = unreadCount > 0 ? ' *' : ''
            const mentionPostfix = mentionCount > 0 ? ` (${mentionCount})` : ''
            return `${channel.name}${unreadPostfix}${mentionPostfix}`
        },
        [mentionCounts, unreadCounts],
    )
    const isSelectedSpace = useCallback(
        (spaceId: RoomIdentifier) => {
            return toRoomIdentifier(spaceSlug)?.matrixRoomId === spaceId.matrixRoomId
        },
        [spaceSlug],
    )
    const isSelectedChannel = useCallback(
        (channelId: RoomIdentifier) => {
            return toRoomIdentifier(channelSlug)?.matrixRoomId === channelId.matrixRoomId
        },
        [channelSlug],
    )
    return (
        <>
            <List>
                {spaces.map((s) => (
                    <ListItem button key={s.id.slug} onClick={() => onClickSpace(s.id)}>
                        <ListItemText>
                            {formatNameWithUnreads(s)}
                            {isSelectedSpace(s.id) && spaceHierarchies[s.id.matrixRoomId] && (
                                <List>
                                    {spaceHierarchies[s.id.matrixRoomId].children.map((c) => (
                                        <ListItem
                                            button
                                            selected={isSelectedChannel(c.id)}
                                            key={c.id.slug}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onClickChannel(s.id, c.id)
                                            }}
                                        >
                                            {formatChannelNameWithUnreads(c)}
                                        </ListItem>
                                    ))}
                                </List>
                            )}
                        </ListItemText>
                    </ListItem>
                ))}
            </List>
        </>
    )
}

const spacingStyle = {
    padding: (theme: Theme) => theme.spacing(2),
    gap: (theme: Theme) => theme.spacing(1),
}
