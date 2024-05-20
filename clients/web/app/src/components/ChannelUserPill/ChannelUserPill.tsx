import React, { useCallback, useContext, useMemo } from 'react'
import { ZTEvent } from 'use-towns-client'
import { uniq } from 'lodash'
import { Box, Paragraph, Stack } from '@ui'
import { CopySpaceLink } from '@components/CopySpaceLink/CopySpaceLink'
import { MessageTimelineContext } from '@components/MessageTimeline/MessageTimelineContext'
import { Avatar } from '@components/Avatar/Avatar'
import { CHANNEL_INFO_PARAMS } from 'routes'
import { PanelLink } from '@components/Panel/PanelLink'
import { useChannelHeaderMembers } from 'hooks/useChannelHeaderMembers'

export const ChannelUsersPill = (props: { spaceId: string | undefined; channelId: string }) => {
    const { spaceId, channelId } = props
    const memberIds = useChannelHeaderMembers(channelId)
    const timelineContext = useContext(MessageTimelineContext)

    const lastInteractedUniqueUserIds = useMemo(() => {
        const NUM_USERS = 3
        const eventIds = timelineContext?.events ?? []
        const lastUniqueIds: string[] = []
        for (let i = eventIds.length - 1; i >= 0 && lastUniqueIds.length < NUM_USERS; i--) {
            if (eventIds[i].content?.kind !== ZTEvent.RoomMessage) {
                continue
            }
            const senderId = eventIds[i].sender.id
            if (
                !lastUniqueIds.includes(senderId) &&
                memberIds.some((userId) => userId === senderId)
            ) {
                lastUniqueIds.push(eventIds[i].sender.id)
            }
        }

        if (lastUniqueIds.length < NUM_USERS) {
            const maxIds = memberIds.slice(0, NUM_USERS).map((userId) => userId)
            return uniq(maxIds.concat(memberIds)).slice(0, NUM_USERS)
        }
        return lastUniqueIds
    }, [timelineContext?.events, memberIds])

    const onClickPreventPropagation = useCallback((e: React.MouseEvent) => {
        e.stopPropagation()
    }, [])

    return (
        <Stack
            horizontal
            rounded="sm"
            height="x4"
            overflow="hidden"
            background="level2"
            onClick={onClickPreventPropagation}
        >
            <PanelLink
                horizontal
                grow
                hoverable
                panel={CHANNEL_INFO_PARAMS.DIRECTORY}
                gap="sm"
                padding="sm"
                alignItems="center"
                background="level2"
            >
                <Stack horizontal gap="line">
                    {lastInteractedUniqueUserIds.map((userId) => (
                        <Avatar key={userId} size="avatar_xs" userId={userId} />
                    ))}
                </Stack>
                <Paragraph size="sm">{memberIds.length > 0 && memberIds.length}</Paragraph>
            </PanelLink>

            {spaceId && (
                <Box centerContent borderLeft hoverable padding="xs" background="level2">
                    <CopySpaceLink
                        spaceId={spaceId}
                        channelId={channelId}
                        align="right"
                        offsetTop="md"
                    />
                </Box>
            )}
        </Stack>
    )
}
