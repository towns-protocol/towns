import { default as React, createContext, useCallback, useContext, useMemo } from 'react'
import { MessageType, useFullyReadMarker } from 'use-zion-client'
import { Box, Divider, VList } from '@ui'
import { notUndefined } from 'ui/utils/utils'
import { DateDivider } from './events/DateDivider'
import { NewDivider } from './events/NewDivider'
import { MessageTimelineItem } from './events/TimelineItem'
import {
    FullyReadRenderEvent,
    MessageRenderEvent,
    RenderEventType,
    ThreadUpdateRenderEvent,
    UserMessagesRenderEvent,
    getEventsByDate,
} from './util/getEventsByDate'
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

    const events = useMemo(() => {
        return timelineContext?.events ?? []
    }, [timelineContext?.events])

    const fullyReadMarker = useFullyReadMarker(channelId, timelineContext?.threadParentId)

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    //                                                                  initialize variables

    const dateGroups = useMemo(
        () =>
            getEventsByDate(
                events,
                fullyReadMarker,
                timelineContext?.type === MessageTimelineType.Thread,
            ),
        [events, fullyReadMarker, timelineContext?.type],
    )
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
            | { id: string; type: 'fully-read'; item: FullyReadRenderEvent }
            | { id: string; type: 'message'; item: MessageRenderEvent }
            | { id: string; type: 'thread-update'; item: ThreadUpdateRenderEvent }

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
                    ? ({ id: e.key, type: 'fully-read', item: e } as const)
                    : e.type === RenderEventType.ThreadUpdate
                    ? ({ id: e.key, type: 'thread-update', item: e } as const)
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

    const groupIds = listItems.reduce((groupIds, item) => {
        if (item.type === 'group') {
            groupIds.push(item.id)
        }
        return groupIds
    }, [] as string[])

    return (
        <VList
            debug={false}
            key={channelId?.matrixRoomId}
            highlightId={props.highlightId}
            esimtateItemSize={estimateItemHeight}
            list={listItems}
            groupIds={groupIds}
            itemRenderer={(r, ref) => {
                return r.type === 'header' ? (
                    <>{props.header}</>
                ) : r.type === 'group' ? (
                    <DateDivider label={r.date} ref={ref} />
                ) : r.type === 'divider' ? (
                    <Box paddingX="md" paddingY="md">
                        <Divider space="none" />
                    </Box>
                ) : r.type === 'fully-read' ? (
                    <NewDivider fullyReadMarker={r.item.event} />
                ) : (
                    <MessageTimelineItem itemData={r.item} highlight={r.id === props.highlightId} />
                )
            }}
        />
    )
}
