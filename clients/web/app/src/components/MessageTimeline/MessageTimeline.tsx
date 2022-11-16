import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import { MessageType, useFullyReadMarker, useMyUserId } from 'use-zion-client'
import { Box, Divider, Stack, VList } from '@ui'
import { useFilterReplies } from 'hooks/useFixMeMessageThread'
import { VListCtrl } from 'ui/components/VList/VList'
import { notUndefined } from 'ui/utils/utils'
import { getIsRoomMessageContent } from 'utils/ztevent_util'
import { DateDivider } from './events/DateDivider'
import { MessageTimelineItem } from './events/TimelineItem'
import {
    FullyReadRenderEvent,
    MessageRenderEvent,
    RenderEventType,
    useGroupEvents,
} from './hooks/useGroupEvents'
import { useTimelineMessageEditing } from './hooks/useTimelineMessageEditing'
import { MessageTimelineContext, MessageTimelineType } from './MessageTimelineContext'
import { NewDivider } from './events/NewDivider'

export const TimelineMessageContext = createContext<null | ReturnType<
    typeof useTimelineMessageEditing
>>(null)

type Props = {
    header?: JSX.Element
}

export const MessageTimeline = (props: Props) => {
    const timelineContext = useContext(MessageTimelineContext)
    const channelId = timelineContext?.channelId

    const rawEvents = useMemo(() => {
        return timelineContext?.events ?? []
    }, [timelineContext?.events])

    const { filteredEvents: events } = useFilterReplies(
        rawEvents,
        timelineContext?.type === MessageTimelineType.Thread,
    )

    const fullyReadMarker = useFullyReadMarker(channelId, timelineContext?.threadParentId)

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    //                                                                  initialize variables

    const lastEvent = useMemo(() => {
        return events?.at(events?.length - 1)
    }, [events])

    const dateGroups = useGroupEvents(events, fullyReadMarker)

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    //                                    estimate height of blocks before they get rendered

    const estimateItemHeight = useCallback((r: typeof listItems[0]) => {
        if (r.type === 'message') {
            const height = r.item.events.reduce((height, item) => {
                const itemHeight = item.content.msgType === MessageType.Image ? 400 : 150
                return height + itemHeight
            }, 0)
            return height
        }
        return 0
    }, [])

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    //                                                                      scroll into view

    const vListCtrlRef = useRef<VListCtrl>()
    const userId = useMyUserId()

    useEffect(() => {
        if (getIsRoomMessageContent(lastEvent)?.sender.id === userId && lastEvent?.isLocalPending) {
            setTimeout(() => {
                vListCtrlRef.current?.scrolldown()
            }, 0)
        }
    }, [lastEvent, userId])

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    //                                                               group and filter events

    const listItems = useMemo(() => {
        type ListItem =
            | { id: string; type: 'divider' }
            | { id: string; type: 'header' }
            | { id: string; type: 'group'; date: string }
            | { id: string; type: 'message'; item: MessageRenderEvent }
            | { id: string; type: 'fullyRead'; item: FullyReadRenderEvent }

        const groupByDate = timelineContext?.type === MessageTimelineType.Channel

        const flatGroups = dateGroups.flatMap((f, index) => {
            return [
                {
                    type: 'group',
                    date: f.date.humanDate,
                    key: f.date.humanDate,
                } as const,
                ...f.events,
            ]
        })

        const isThreadOrigin =
            timelineContext?.type === MessageTimelineType.Thread && flatGroups.length > 1

        const listItems: ListItem[] = flatGroups
            .map((e) => {
                return e.type === 'group' && groupByDate
                    ? ({ id: e.key, type: 'group', date: e.date } as const)
                    : e.type === RenderEventType.UserMessageGroup
                    ? ({ id: e.key, type: 'message', item: e } as const)
                    : e.type === RenderEventType.FullyRead
                    ? ({ id: e.key, type: 'fullyRead', item: e } as const)
                    : undefined
            })
            .filter(notUndefined)

        if (timelineContext?.type === MessageTimelineType.Channel) {
            listItems.unshift({ id: 'header', type: 'header' } as const)
        } else if (isThreadOrigin) {
            listItems.splice(1, 0, { id: 'divider', type: 'divider' } as const)
        }

        return listItems
    }, [dateGroups, timelineContext?.type])

    return (
        <VList
            debug={false}
            ctrlRef={vListCtrlRef}
            itemHeight={estimateItemHeight}
            list={listItems}
            renderItem={(r, i, l) => {
                return r.type === 'header' ? (
                    <>{props.header}</>
                ) : r.type === 'group' ? (
                    <Stack position="relative" style={{ boxShadow: '0 0 1px #f000' }} height="x4">
                        <DateDivider label={r.date} />
                    </Stack>
                ) : r.type === 'divider' ? (
                    <Box paddingX="md" paddingY="md">
                        <Divider space="none" />
                    </Box>
                ) : r.type === 'fullyRead' ? (
                    <NewDivider fullyReadMarker={r.item.event} />
                ) : (
                    <MessageTimelineItem itemData={r.item} />
                )
            }}
        />
    )
}
