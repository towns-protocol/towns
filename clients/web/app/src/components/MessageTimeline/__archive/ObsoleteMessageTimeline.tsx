import React, { useCallback, useContext, useMemo } from 'react'
import { useZionContext } from 'use-zion-client'
import { Box, Button, Stack } from '@ui'
import { useFilterReplies } from 'hooks/useFixMeMessageThread'
import { useGroupEvents } from '../hooks/useGroupEvents'

import { MessageTimelineContext, MessageTimelineType } from '../MessageTimelineContext'
import { MessageTimelineItem } from '../events/TimelineItem'

export const ObsoleteMessageTimeline = () => {
    const { unreadCounts } = useZionContext()

    const timelineContext = useContext(MessageTimelineContext)
    const channelId = timelineContext?.channelId
    const events = useMemo(() => {
        return timelineContext?.events ?? []
    }, [timelineContext?.events])

    const { filteredEvents } = useFilterReplies(
        events,
        timelineContext?.type === MessageTimelineType.Thread,
    )

    const lastEvent = useMemo(() => {
        return events?.at(events?.length - 1)?.eventId
    }, [events])

    const onMarkAsRead = useCallback(() => {
        if (channelId && lastEvent) {
            timelineContext?.sendReadReceipt(channelId, lastEvent)
        }
    }, [channelId, lastEvent, timelineContext])

    const dateGroups = useGroupEvents(filteredEvents)

    if (!timelineContext || !channelId) {
        return <></>
    }

    const { type } = timelineContext

    const hasUnread = (unreadCounts[channelId.matrixRoomId] ?? 0) > 0

    const readMore = hasUnread && (
        <Box centerContent gap="sm">
            <Button
                animate={false}
                key={channelId.slug + 'mark-as-read'}
                size="button_sm"
                onClick={onMarkAsRead}
            >
                Mark as Read ({unreadCounts[channelId.matrixRoomId]})
            </Button>
        </Box>
    )

    return (
        <>
            {dateGroups.map((dateGroup) => {
                const renderEvents = dateGroup.events.map((r) => {
                    return <MessageTimelineItem itemData={r} key={r.key} />
                })

                return type === MessageTimelineType.Channel ? (
                    <Stack key={dateGroup.date.humanDate} position="relative">
                        <DateDivider label={dateGroup.date.humanDate} />
                        {renderEvents}
                    </Stack>
                ) : (
                    <>{renderEvents}</>
                )
            })}
            {readMore}
        </>
    )
}

export const DateDivider = (props: { label: string }) => (
    <>
        <Box left right top="md" position="absolute" paddingX="lg">
            <Box borderTop />
        </Box>
        <Box centerContent top="md" display="block" position="sticky" zIndex="ui">
            <Box centerContent>
                <Box
                    border
                    paddingY="sm"
                    paddingX="md"
                    rounded="md"
                    background="default"
                    color="gray2"
                    fontSize="sm"
                >
                    {props.label}
                </Box>
            </Box>
        </Box>
    </>
)
