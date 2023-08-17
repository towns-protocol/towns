import React, { useCallback, useMemo } from 'react'
import { ThreadStats, useChannelId, useSpaceId, useSpaceMembers } from 'use-zion-client'
import { useOpenMessageThread } from 'hooks/useOpenThread'
import { Avatar, Box, Paragraph, Pill, Stack } from '@ui'
import { notUndefined } from 'ui/utils/utils'

type Props = {
    threadStats: ThreadStats
    eventId: string
    userId?: string | null
}

export const RepliesButton = (props: Props) => {
    const { threadStats, eventId, userId } = props
    const { replyCount } = threadStats

    const { membersMap } = useSpaceMembers()

    const spaceId = useSpaceId()
    const channelId = useChannelId()

    const users = useMemo(
        () =>
            Array.from(threadStats.userIds)
                .map((u) => membersMap[u])
                .filter(notUndefined),
        [membersMap, threadStats.userIds],
    )

    const isOwn = userId && users.some((u) => u.userId === userId)

    const { onOpenMessageThread } = useOpenMessageThread(spaceId, channelId)

    const onClick = useCallback(() => onOpenMessageThread(eventId), [onOpenMessageThread, eventId])

    return (
        <Pill rounded="sm" height={{ default: 'x4' }} border={isOwn ? 'accent' : undefined}>
            <Box shrink centerContent horizontal gap="sm" cursor="pointer" onClick={onClick}>
                <Stack horizontal gap="xs">
                    {users.slice(0, 3).map((u) => (
                        <Avatar userId={u.userId} key={u.userId} size="avatar_xs" />
                    ))}
                </Stack>
                <Stack paddingBottom="xxs">
                    <Paragraph size="sm" color="default" fontWeight="medium">
                        {replyCount}
                        {replyCount > 1 ? ' replies' : ' reply'}
                    </Paragraph>
                </Stack>
            </Box>
        </Pill>
    )
}
