import React, { useCallback, useRef, useState } from 'react'
import {
    useChannelId,
    useChannelThreadStat,
    useFullyReadMarker,
    useSpaceId,
    useSpaceMembers,
} from 'use-zion-client'
import { truncate } from 'lodash'
import { RichTextPreviewPlain } from '@components/RichText/RichTextEditor'
import { Avatar, Box, Stack } from '@ui'
import { useHover } from 'hooks/useHover'
import { useOpenMessageThread } from 'hooks/useOpenThread'
import { notUndefined } from 'ui/utils/utils'
import { ZRoomMessageEvent } from '../hooks/useGroupEvents'

type Props = {
    events: ZRoomMessageEvent[]
}
export const TimelineThreadUpdates = (props: Props) => {
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
        <Stack>
            {Object.entries(grouped).map(([threadParentId, events]) => (
                <ThreadRootPreview2
                    key={threadParentId}
                    threadParentId={threadParentId}
                    events={events}
                />
            ))}
        </Stack>
    )
}

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
        (events.at(-1)?.originServerTs ?? 0) >= fullyReadMarker.eventOriginServerTs
    const userIds = [...new Set<string>(events.map((e) => e.content.sender.id))]
    const message = truncate(threadStats.parentMessageContent.body, { length: 16 })

    return (
        <Stack ref={ref} onMouseEnter={onMouseEnter} {...backgroundProps} onClick={onClick}>
            <Box
                centerContent
                horizontal
                paddingX="lg"
                paddingY="sm"
                gap="sm"
                color={isUnread ? 'gray1' : 'gray2'}
            >
                <Stack horizontal gap="xs">
                    {userIds
                        .map((u) => membersMap[u])
                        .filter(notUndefined)
                        .map((u) => (
                            <Avatar src={u.avatarUrl} key={u.userId} size="avatar_xs" />
                        ))}
                </Stack>
                <RichTextPreviewPlain content={`replied to "${message}"`} edited={false} />
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
