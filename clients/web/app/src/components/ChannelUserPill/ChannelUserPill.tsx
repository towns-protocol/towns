import React from 'react'
import { RoomIdentifier, useChannelMembers } from 'use-zion-client'
import { Link } from 'react-router-dom'
import { Avatar, Box, Paragraph, Stack } from '@ui'
import { CopySpaceLink } from '@components/CopySpaceLink/CopySpaceLink'

export const ChannelUsersPill = (props: { spaceId: RoomIdentifier; channelId: RoomIdentifier }) => {
    const { spaceId } = props

    const { members } = useChannelMembers()

    return (
        <Stack horizontal border="level4" background="level3" rounded="sm" height="height_lg">
            <Link to="info?directory">
                <Stack horizontal grow gap="sm" padding="sm" alignItems="center">
                    <Stack horizontal gap="line">
                        {members.slice(0, 3).map((m) => (
                            <Avatar key={m.userId} size="avatar_sm" userId={m.userId} />
                        ))}
                    </Stack>
                    <Paragraph size="sm">{members.length}</Paragraph>
                </Stack>
            </Link>

            <Box centerContent paddingX="xs" borderLeft="level4">
                <CopySpaceLink
                    spaceId={spaceId}
                    align="right"
                    offsetTop="md"
                    background={{
                        default: 'level3',
                    }}
                />
            </Box>
        </Stack>
    )
}
