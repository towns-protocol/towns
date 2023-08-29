import React, { useCallback, useRef, useState } from 'react'
import {
    useChannelId,
    useChannelThreadStat,
    useFullyReadMarker,
    useSpaceId,
    useSpaceMembers,
} from 'use-zion-client'
import { truncate } from 'lodash'
import { Avatar, Box, Paragraph, Stack } from '@ui'
import { useHover } from 'hooks/useHover'
import { useOpenMessageThread } from 'hooks/useOpenThread'
import { notUndefined } from 'ui/utils/utils'
import { ZRoomMessageEvent } from '../../MessageTimeline/util/getEventsByDate'

type Props = {
    events: ZRoomMessageEvent[]
}
export const TimelineThreadUpdates = React.memo((props: Props) => {
    const { events } = props

    const grouped = events.reduce((acc, e) => {
        const threadParentId = e.threadParentId
        if (threadParentId) {
            if (acc[threadParentId]) {
                acc[threadParentId].push(e)
            } else {
                acc[threadParentId] = [e]
            }
        }
        return acc
    }, {} as Record<string, ZRoomMessageEvent[]>)

    return (
        <Stack paddingY="md" gap="sm">
            {Object.entries(grouped).map(([threadParentId, events]) => (
                <ThreadRootPreview2
                    key={threadParentId}
                    threadParentId={threadParentId}
                    events={events}
                />
            ))}
        </Stack>
    )
})

const ThreadRootPreview2 = (props: { threadParentId: string; events: ZRoomMessageEvent[] }) => {
    const { events, threadParentId } = props
    const ref = useRef<HTMLDivElement>(null)
    const { isHover, onMouseEnter } = useHover(ref)
    const backgroundProps = useMessageBackground(false, isHover, false)
    const spaceId = useSpaceId()
    const channelId = useChannelId()
    const { membersMap } = useSpaceMembers()
    const threadStats = useChannelThreadStat(threadParentId)
    const fullyReadMarker = useFullyReadMarker(channelId, threadParentId)
    const { onOpenMessageThread } = useOpenMessageThread(spaceId, channelId)
    const onClick = useCallback(
        () => onOpenMessageThread(threadParentId),
        [onOpenMessageThread, threadParentId],
    )
    if (!threadStats?.parentMessageContent) {
        return null // aellis 11/22/2020: this should probably never happen?
        // we might need to add agressive fetching for the roots of active threads
        // BUT - we have a bunch of threads in the prototype that were created
        // with the wrong thread ID, so they don't have a parent message any more
    }
    const isUnread =
        fullyReadMarker?.isUnread === true &&
        (events.at(-1)?.createdAtEpocMs ?? 0) >= fullyReadMarker.eventCreatedAtEpocMs
    const userIds = [...new Set<string>(events.map((e) => e.sender.id))]
    const message = truncate(threadStats.parentMessageContent.body, { length: 128 })

    return (
        <Stack centerContent ref={ref} insetY="xs" onMouseEnter={onMouseEnter} onClick={onClick}>
            <Box
                centerContent
                horizontal
                cursor="pointer"
                padding="sm"
                gap="sm"
                color={isUnread ? 'gray1' : 'gray2'}
                rounded="md"
                {...backgroundProps}
            >
                <Stack horizontal gap="xs">
                    {userIds
                        .map((u) => membersMap[u])
                        .filter(notUndefined)
                        .map((u) => (
                            <Avatar key={u.userId} size="avatar_xs" userId={u.userId} />
                        ))}
                </Stack>
                <Box maxWidth="300">
                    <Paragraph truncate size="sm">{`replied to "${message}"`}</Paragraph>
                </Box>
            </Box>
        </Stack>
    )
}

const useMessageBackground = (isEditing?: boolean, isHover?: boolean, isHighlight?: boolean) => {
    const background = isEditing || isHover ? ('level2' as const) : undefined

    const [backgroundTransitionEnabled, setBackgroundTransitionEnabled] = useState(isHighlight)

    const onTransitionEnd = isHighlight
        ? () => {
              setBackgroundTransitionEnabled(false)
          }
        : undefined

    const style = backgroundTransitionEnabled ? { transition: `background 1s ease` } : undefined

    return { onTransitionEnd, style, background }
}
