import React, { useCallback, useContext, useMemo } from 'react'
import { useFullyReadMarker } from 'use-zion-client'
import { Box, Button, Stack } from '@ui'
import { useFilterReplies } from 'hooks/useFixMeMessageThread'
import { useGroupEvents } from '../hooks/useGroupEvents'

import { MessageTimelineContext, MessageTimelineType } from '../MessageTimelineContext'
import { MessageTimelineItem } from '../events/TimelineItem'

export const ObsoleteMessageTimeline = () => {
    const timelineContext = useContext(MessageTimelineContext)
    const channelId = timelineContext?.channelId
    const events = useMemo(() => {
        return timelineContext?.events ?? []
    }, [timelineContext?.events])

    const { filteredEvents } = useFilterReplies(
        events,
        timelineContext?.type === MessageTimelineType.Thread,
    )

    const fullyReadMarker = useFullyReadMarker(channelId, timelineContext?.threadParentId)

    const onMarkAsRead = useCallback(() => {
        if (channelId && fullyReadMarker) {
            timelineContext?.sendReadReceipt(fullyReadMarker)
        }
    }, [channelId, fullyReadMarker, timelineContext])

    const dateGroups = useGroupEvents(filteredEvents, fullyReadMarker)

    if (!timelineContext || !channelId) {
        return <></>
    }

    const { type } = timelineContext

    const readMore = fullyReadMarker?.isUnread && (
        <Box centerContent gap="sm">
            <Button
                animate={false}
                key={channelId.slug + 'mark-as-read'}
                size="button_sm"
                onClick={onMarkAsRead}
            >
                Mark as Read
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
