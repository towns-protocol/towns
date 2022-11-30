import { default as React, createContext, useCallback, useContext, useMemo, useRef } from 'react'
import { FullyReadMarker, MessageType, useFullyReadMarker } from 'use-zion-client'
import { Box, Divider, VList } from '@ui'
import { notUndefined } from 'ui/utils/utils'
import { DateDivider } from './events/DateDivider'
import { NewDivider } from './events/NewDivider'
import { MessageTimelineItem } from './events/TimelineItem'
import { useTimelineMessageEditing } from './hooks/useTimelineMessageEditing'
import { MessageTimelineContext, MessageTimelineType } from './MessageTimelineContext'
import {
    FullyReadRenderEvent,
    MessageRenderEvent,
    RenderEventType,
    ThreadUpdateRenderEvent,
    UserMessagesRenderEvent,
    getEventsByDate,
} from './util/getEventsByDate'

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

    const fullyPersistedRef = useRef<FullyReadMarker>()
    // if a marker is shown once it will keep displaying until timeline gets
    // unmounted despite the marker flipping to unread
    fullyPersistedRef.current =
        !fullyPersistedRef.current && !fullyReadMarker?.isUnread ? undefined : fullyReadMarker

    const fullyReadPersisted = fullyPersistedRef.current

    const dateGroups = useMemo(
        () =>
            getEventsByDate(
                events,
                fullyReadPersisted,
                timelineContext?.type === MessageTimelineType.Thread,
            ),
        [events, fullyReadPersisted, timelineContext?.type],
    )

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
            | { id: string; type: 'group'; date: string; isNew?: boolean }
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
                    isNew: f.isNew,
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
                    ? ({ id: e.key, type: 'group', date: e.date, isNew: e.isNew } as const)
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
        } else if (isThreadOrigin && listItems.length > 1 && listItems[1]?.type !== 'fully-read') {
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
                    <DateDivider label={r.date} ref={ref} new={r.isNew} />
                ) : r.type === 'divider' ? (
                    <Box paddingX="md" paddingY="md">
                        <Divider space="none" />
                    </Box>
                ) : r.type === 'fully-read' ? (
                    <NewDivider
                        fullyReadMarker={r.item.event}
                        hidden={r.item.isHidden}
                        paddingX={
                            timelineContext?.type === MessageTimelineType.Channel ? 'lg' : 'md'
                        }
                    />
                ) : (
                    <MessageTimelineItem itemData={r.item} highlight={r.id === props.highlightId} />
                )
            }}
        />
    )
}
