import React, { useContext, useMemo } from 'react'
import { RoomIdentifier, ZTEvent, useChannelMembers } from 'use-zion-client'
import { Link } from 'react-router-dom'
import { uniq } from 'lodash'
import { Avatar, Box, Paragraph, Stack } from '@ui'
import { CopySpaceLink } from '@components/CopySpaceLink/CopySpaceLink'
import { MessageTimelineContext } from '@components/MessageTimeline/MessageTimelineContext'

export const ChannelUsersPill = (props: { spaceId: RoomIdentifier; channelId: RoomIdentifier }) => {
    const { spaceId } = props
    const { members } = useChannelMembers()
    const timelineContext = useContext(MessageTimelineContext)

    const lastInteractedUniqueUserIds = useMemo(() => {
        const NUM_USERS = 3
        const eventIds = timelineContext?.events ?? []
        const lastUniqueIds: string[] = []
        for (let i = eventIds.length - 1; i >= 0 && lastUniqueIds.length < NUM_USERS; i--) {
            if (eventIds[i].content?.kind !== ZTEvent.RoomMessage) {
                continue
            }
            if (!lastUniqueIds.includes(eventIds[i].sender.id)) {
                lastUniqueIds.push(eventIds[i].sender.id)
            }
        }

        if (lastUniqueIds.length < NUM_USERS) {
            const memberIds = members.slice(0, NUM_USERS).map((m) => m.userId)
            return uniq(lastUniqueIds.concat(memberIds)).slice(0, NUM_USERS)
        }
        return lastUniqueIds
    }, [timelineContext?.events, members])

    return (
        <Stack horizontal border="level4" background="level3" rounded="sm" height="height_lg">
            <Link to="info?directory">
                <Stack horizontal grow gap="sm" padding="sm" alignItems="center">
                    <Stack horizontal gap="line">
                        {lastInteractedUniqueUserIds.map((userId) => (
                            <Avatar key={userId} size="avatar_sm" userId={userId} />
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
