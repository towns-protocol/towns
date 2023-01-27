import React from 'react'
import useEvent from 'react-use-event-hook'
import { RoomIdentifier, useChannelMembers } from 'use-zion-client'
import { useNavigate } from 'react-router-dom'
import { Avatar, Box, IconButton, Paragraph, Stack } from '@ui'

export const ChannelUsersPill = (props: { spaceId: RoomIdentifier; channelId: RoomIdentifier }) => {
    const { spaceId, channelId } = props

    const { members } = useChannelMembers()

    const navigate = useNavigate()

    const onInviteClick = useEvent((e: React.MouseEvent) => {
        e.preventDefault()
        navigate(`/spaces/${spaceId.slug}/channels/${channelId.slug}/settings`)
    })

    return (
        <Stack horizontal border="level4" background="level3" rounded="sm" height="height_lg">
            <Stack horizontal grow gap="sm" padding="sm" alignItems="center">
                <Stack horizontal gap="line">
                    {members.slice(0, 3).map((m) => (
                        <Avatar key={m.userId} src={m.avatarUrl} size="avatar_sm" />
                    ))}
                </Stack>
                <Paragraph size="sm">{members.length}</Paragraph>
            </Stack>
            <Box centerContent paddingX="xs" borderLeft="level4">
                <IconButton icon="personAdd" size="square_sm" onClick={onInviteClick} />
            </Box>
        </Stack>
    )
}
