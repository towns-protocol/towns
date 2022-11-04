import React, { useCallback } from 'react'
import { ThreadStats, useChannelId, useSpaceId, useSpaceMembers } from 'use-zion-client'
import { useOpenMessageThread } from 'hooks/useOpenThread'
import { Avatar, Box, Paragraph, Stack } from '@ui'
import { notUndefined } from 'ui/utils/utils'

export const MessageThreadButton = (props: { threadStats: ThreadStats; eventId: string }) => {
    const { threadStats, eventId } = props
    const { replyCount } = threadStats

    const { membersMap } = useSpaceMembers()

    const spaceId = useSpaceId()
    const channelId = useChannelId()

    const { onOpenMessageThread } = useOpenMessageThread(spaceId, channelId)

    const onClick = useCallback(() => onOpenMessageThread(eventId), [onOpenMessageThread, eventId])

    return (
        <Box horizontal border height="height_lg" paddingX="sm" rounded="sm" background="level2">
            <Box shrink centerContent horizontal gap="sm" cursor="pointer" onClick={onClick}>
                <Stack horizontal gap="xs">
                    {Array.from(threadStats.userIds)
                        .map((u) => membersMap[u])
                        .filter(notUndefined)
                        .map((u) => (
                            <Avatar src={u.avatarUrl} key={u.userId} size="avatar_sm" />
                        ))}
                </Stack>
                <Paragraph size="md">
                    {replyCount}
                    {replyCount > 1 ? ' replies' : ' reply'}
                </Paragraph>
            </Box>
        </Box>
    )
}
