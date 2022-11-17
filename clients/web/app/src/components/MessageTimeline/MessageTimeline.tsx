import { default as React, createContext, useCallback, useContext, useMemo } from 'react'
import { MessageType, useFullyReadMarker } from 'use-zion-client'
import { Box, Divider, Stack, VList } from '@ui'
import { useFilterReplies } from 'hooks/useFixMeMessageThread'
import { notUndefined } from 'ui/utils/utils'
import { DateDivider } from './events/DateDivider'
import { NewDivider } from './events/NewDivider'
import { MessageTimelineItem } from './events/TimelineItem'
import {
    FullyReadRenderEvent,
    MessageRenderEvent,
    RenderEventType,
    UserMessagesRenderEvent,
    useGroupEvents,
} from './hooks/useGroupEvents'
import { useTimelineMessageEditing } from './hooks/useTimelineMessageEditing'
import { MessageTimelineContext, MessageTimelineType } from './MessageTimelineContext'

export const TimelineMessageContext = createContext<null | ReturnType<
    typeof useTimelineMessageEditing
>>(null)

type Props = {
    header?: JSX.Element
    highlightId?: string
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

    const dateGroups = useGroupEvents(events, fullyReadMarker)
    // timelineContext?.type === MessageTimelineType.Thread

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    //                                    estimate height of blocks before they get rendered

    const estimateItemHeight = useCallback((r: typeof listItems[0]) => {
        if (r.type === 'user-messages') {
            const height = r.item.events.reduce((height, item) => {
                const itemHeight = item.content.msgType === MessageType.Image ? 400 : 100
                return height + itemHeight
            }, 0)
            return height
        }
        if (r.type === 'message') {
            const height = [r.item.event].reduce((height, item) => {
                const itemHeight = item.content.msgType === MessageType.Image ? 400 : 50
                return height + itemHeight
            }, 0)
            return height
        }
        if (r.type === 'divider') {
            return 50
        }
    }, [])

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    //                                                               group and filter events

    const listItems = useMemo(() => {
        type ListItem =
            | { id: string; type: 'divider' }
            | { id: string; type: 'header' }
            | { id: string; type: 'group'; date: string }
            | { id: string; type: 'user-messages'; item: UserMessagesRenderEvent }
            | { id: string; type: 'fullyRead'; item: FullyReadRenderEvent }
            | { id: string; type: 'message'; item: MessageRenderEvent }

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
            .flatMap<ListItem>((e) => {
                return e.type === 'group' && groupByDate
                    ? ({ id: e.key, type: 'group', date: e.date } as const)
                    : e.type === RenderEventType.FullyRead
                    ? ({ id: e.key, type: 'fullyRead', item: e } as const)
                    : e.type === RenderEventType.UserMessages
                    ? e.events.map((event, index, events) => {
                          return {
                              type: 'message',
                              id: event.eventId,
                              item: {
                                  type: RenderEventType.Message,
                                  key: event.eventId,
                                  event,
                                  displayContext:
                                      index > 0 ? 'tail' : events.length > 1 ? 'head' : 'single',
                              } as const,
                          } as const
                      })
                    : []
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
            key={channelId?.matrixRoomId}
            highlightId={props.highlightId}
            esimtateItemSize={estimateItemHeight}
            list={listItems}
            renderItem={(r) => {
                return r.type === 'header' ? (
                    <>{props.header}</>
                ) : r.type === 'group' ? (
                    <Stack position="relative" height="x4">
                        <DateDivider label={r.date} />
                    </Stack>
                ) : r.type === 'divider' ? (
                    <Box paddingX="md" paddingY="md">
                        <Divider space="none" />
                    </Box>
                ) : r.type === 'fullyRead' ? (
                    <NewDivider fullyReadMarker={r.item.event} />
                ) : (
                    <MessageTimelineItem itemData={r.item} highlight={r.id === props.highlightId} />
                )
            }}
        />
    )
}
