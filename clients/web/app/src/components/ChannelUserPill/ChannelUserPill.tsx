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
        <Stack horizontal border rounded="sm" height="height_lg" overflow="hidden">
            <Link to="info?directory">
                <Stack
                    horizontal
                    grow
                    hoverable
                    gap="sm"
                    padding="sm"
                    alignItems="center"
                    background="level2"
                >
                    <Stack horizontal gap="line">
                        {lastInteractedUniqueUserIds.map((userId) => (
                            <Avatar key={userId} size="avatar_sm" userId={userId} />
                        ))}
                    </Stack>
                    <Paragraph size="sm">{members.length}</Paragraph>
                </Stack>
            </Link>

            <Box centerContent borderLeft hoverable paddingX="xs" background="level2">
                <CopySpaceLink spaceId={spaceId} align="right" offsetTop="md" />
            </Box>
        </Stack>
    )
}
