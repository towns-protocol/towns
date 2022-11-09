import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import { MessageType, useMyUserId, useZionContext } from 'use-zion-client'
import { Box, Divider, Stack, VList } from '@ui'
import { useFilterReplies } from 'hooks/useFixMeMessageThread'
import { VListCtrl } from 'ui/components/VList/VList'
import { notUndefined } from 'ui/utils/utils'
import { getIsRoomMessageContent } from 'utils/ztevent_util'
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

    // mark channel as unread after a short time (FIXME)

    const lastEvent = useMemo(() => {
        return events?.at(events?.length - 1)
    }, [events])

    const lastEventId = lastEvent?.eventId

    const onMarkAsRead = useCallback(() => {
        if (channelId && lastEventId) {
            console.log(`mark as unread ${channelId.slug} ${lastEventId}`)
            timelineContext?.sendReadReceipt(channelId, lastEventId)
        }
    }, [channelId, lastEventId, timelineContext])

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

    // estimate height of blocks before they get rendered

    const estimateItemHeight = useCallback((r: typeof ungroupedEvents[0]) => {
        if (r.type === 'message') {
            const height = r.item.events.reduce((height, item) => {
                const itemHeight = item.content.msgType === MessageType.Image ? 400 : 150
                return height + itemHeight
            }, 0)
            return height
        }
        return 0
    }, [])

    // scroll into view

    const vListCtrlRef = useRef<VListCtrl>()
    const userId = useMyUserId()

    useEffect(() => {
        if (getIsRoomMessageContent(lastEvent)?.sender.id === userId && lastEvent?.isLocalPending) {
            setTimeout(() => {
                vListCtrlRef.current?.scrolldown()
            }, 50)
        }
    }, [lastEvent, userId])

    if (!timelineContext || !channelId) {
        return <></>
    }

    // group and filter events

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
            ctrlRef={vListCtrlRef}
            itemHeight={estimateItemHeight}
            list={ungroupedEvents}
            renderItem={(r, i, l) => {
                const isThreadOrigin =
                    timelineContext?.type === MessageTimelineType.Thread && i == 0 && l.length > 1

                return r.type === 'group' ? (
                    <Stack position="relative" style={{ boxShadow: '0 0 1px #f000' }} height="x4">
                        <DateDivider label={r.item.date} />
                    </Stack>
                ) : (
                    <>
                        <MessageTimelineItem itemData={r.item} />
                        {isThreadOrigin ? (
                            <Box paddingX="md" paddingY="md">
                                <Divider space="none" />
                            </Box>
                        ) : (
                            <></>
                        )}
                    </>
                )
            }}
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
