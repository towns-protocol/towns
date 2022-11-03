import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react'
import { MessageType, useZionContext } from 'use-zion-client'
import { Box, Stack, VList } from '@ui'
import { useFilterReplies } from 'hooks/useFixMeMessageThread'
import { notUndefined } from 'ui/utils/utils'
import { MessageTimelineItem } from './events/TimelineItem'
import { RenderEventType, useGroupEvents } from './hooks/useGroupEvents'
import { useTimelineMessageEditing } from './hooks/useTimelineMessageEditing'
import { MessageTimelineContext, MessageTimelineType } from './MessageTimelineContext'

export const TimelineMessageContext = createContext<null | ReturnType<
    typeof useTimelineMessageEditing
>>(null)

export const MessageTimelineVirtual = () => {
    const { unreadCounts } = useZionContext()
    const timelineContext = useContext(MessageTimelineContext)

    const channelId = timelineContext?.channelId
    const rawEvents = useMemo(() => {
        return timelineContext?.events ?? []
    }, [timelineContext?.events])

    const { filteredEvents: events } = useFilterReplies(
        rawEvents,
        timelineContext?.type === MessageTimelineType.Thread,
    )

    const lastEvent = useMemo(() => {
        return events?.at(events?.length - 1)?.eventId
    }, [events])

    const onMarkAsRead = useCallback(() => {
        if (channelId && lastEvent) {
            console.log(`mark as unread ${channelId.slug} ${lastEvent}`)
            timelineContext?.sendReadReceipt(channelId, lastEvent)
        }
    }, [channelId, lastEvent, timelineContext])

    const hasUnread = (unreadCounts[channelId?.matrixRoomId ?? ''] ?? 0) > 0

    useEffect(() => {
        if (hasUnread) {
            const timeout = setTimeout(onMarkAsRead, 3000)
            return () => {
                clearTimeout(timeout)
            }
        }
    }, [hasUnread, onMarkAsRead])

    const dateGroups = useGroupEvents(events)

    const guesstimateItemHeight = useCallback((r: typeof ungroupedEvents[0]) => {
        if (r.type === 'message') {
            const height = r.item.events.reduce((height, item) => {
                const itemHeight = item.content.msgType === MessageType.Image ? 400 : 150
                return height + itemHeight
            }, 0)
            return height
        }
        return 0
    }, [])

    if (!timelineContext || !channelId) {
        return <></>
    }
    const groupByDate = timelineContext.type === MessageTimelineType.Channel

    const ungroupedEvents = dateGroups
        .flatMap((f) => {
            return [
                {
                    type: 'group' as const,
                    date: f.date.humanDate,
                    key: f.date.humanDate,
                },
                ...f.events,
            ]
        })
        .map((e) => {
            return e.type === 'group' && groupByDate
                ? ({ id: e.key, type: 'group', item: e } as const)
                : e.type === RenderEventType.UserMessageGroup
                ? ({ id: e.key, type: 'message', item: e } as const)
                : undefined
        })
        .filter(notUndefined)

    return (
        <VList
            debug={false}
            itemHeight={guesstimateItemHeight}
            list={ungroupedEvents}
            renderItem={(r) =>
                r.type === 'group' ? (
                    <Stack position="relative" style={{ height: 32, boxShadow: '0 0 1px #f000' }}>
                        <DateDivider label={r.item.date} />
                    </Stack>
                ) : (
                    <MessageTimelineItem itemData={r.item} />
                )
            }
        />
    )
}

const DateDivider = (props: { label: string }) => (
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
