import React, {
    MutableRefObject,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import {
    FullyReadMarker,
    MessageType,
    ZTEvent,
    useFullyReadMarker,
    useZionClient,
} from 'use-zion-client'
import { Box, Divider, Paragraph, VList } from '@ui'
import { useExperimentsStore } from 'store/experimentsStore'
import { notUndefined } from 'ui/utils/utils'
import { MessageTimelineItem } from '@components/MessageTimeIineItem/TimelineItem'
import { useDebounce } from 'hooks/useDebounce'
import { useDevice } from 'hooks/useDevice'
import { MessageTimelineContext, MessageTimelineType } from './MessageTimelineContext'
import { DateDivider } from '../MessageTimeIineItem/items/DateDivider'
import { NewDivider } from '../MessageTimeIineItem/items/NewDivider'
import {
    EncryptedMessageRenderEvent,
    FullyReadRenderEvent,
    MessageRenderEvent,
    RedactedMessageRenderEvent,
    RenderEvent,
    RenderEventType,
    ThreadUpdateRenderEvent,
    UserMessagesRenderEvent,
    getEventsByDate,
    isRedactedRoomMessage,
    isRoomMessage,
} from './util/getEventsByDate'

type Props = {
    header?: JSX.Element
    highlightId?: string
    collapsed?: boolean
    containerRef?: MutableRefObject<HTMLDivElement | null>
}

export const MessageTimeline = (props: Props) => {
    const timelineContext = useContext(MessageTimelineContext)
    const repliesMap = timelineContext?.messageRepliesMap
    const channelId = timelineContext?.channelId
    const isChannelEncrypted = timelineContext?.isChannelEncrypted
    const channelName = timelineContext?.channels.find((c) => c.id.slug === channelId?.slug)?.label
    const userId = timelineContext?.userId
    const { isTouch } = useDevice()
    const [isCollapsed, setCollapsed] = useState(props.collapsed ?? false)
    const onExpandClick = useCallback(() => {
        setCollapsed(false)
    }, [])

    const events = useMemo(() => {
        return timelineContext?.events ?? []
    }, [timelineContext?.events])

    const fullyReadMarker = useFullyReadMarker(channelId, timelineContext?.threadParentId)
    const experiments = useExperimentsStore()

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    //                                                                  initialize variables

    const fullyPersistedRef = useRef<FullyReadMarker>()
    // if a marker is shown once it will keep displaying until timeline gets
    // unmounted despite the marker flipping to unread
    fullyPersistedRef.current =
        !fullyPersistedRef.current && !fullyReadMarker?.isUnread ? undefined : fullyReadMarker

    const fullyReadPersisted = fullyPersistedRef.current

    const isSentRef = useRef(fullyReadMarker && !fullyReadMarker.isUnread)
    const { sendReadReceipt } = useZionClient()
    const onMarkAsRead = useCallback(
        (fullyReadMarker: FullyReadMarker) => {
            if (isSentRef.current) {
                // repeated calls can occur if server reponse is lagging and
                // user scrolls back into view
                return
            }
            sendReadReceipt(fullyReadMarker)
            isSentRef.current = true
        },
        [sendReadReceipt],
    )

    const isThread = timelineContext?.type === MessageTimelineType.Thread

    const dateGroups = useMemo(
        () => getEventsByDate(events, fullyReadPersisted, isThread, repliesMap, experiments),
        [events, fullyReadPersisted, isThread, repliesMap, experiments],
    )

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    //                                    estimate height of blocks before they get rendered

    const estimateItemHeight = useCallback((r: (typeof debouncedListItems)[0]) => {
        if (r.type === 'user-messages') {
            const height = r.item.events.reduce((height, item) => {
                const itemHeight =
                    !item.isRedacted &&
                    item.content.kind === ZTEvent.RoomMessage &&
                    item.content.msgType === MessageType.Image
                        ? 400
                        : 26.5
                return height + itemHeight
            }, 0)
            return height
        }
        if (r.type === 'message') {
            const height = [r.item.event].reduce((height, item) => {
                const itemHeight =
                    isRoomMessage(item) && item.content.msgType === MessageType.Image ? 400 : 26.5
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

    const flatGroups = useMemo(
        () =>
            dateGroups.flatMap((f, index) => {
                return [
                    {
                        type: 'group',
                        date: f.date.humanDate,
                        isNew: f.isNew,
                        key: f.date.humanDate,
                    } as const,
                    ...f.events,
                ]
            }),
        [dateGroups],
    )

    const allListItems = useMemo(() => {
        type ListItem =
            | { id: string; type: 'divider' }
            | { id: string; type: 'expander' }
            | { id: string; type: 'header' }
            | { id: string; type: 'group'; date: string; isNew?: boolean }
            | { id: string; type: 'user-messages'; item: UserMessagesRenderEvent }
            | { id: string; type: 'fully-read'; item: FullyReadRenderEvent }
            | {
                  id: string
                  type: 'message'
                  item:
                      | MessageRenderEvent
                      | EncryptedMessageRenderEvent
                      | RedactedMessageRenderEvent
              }
            | { id: string; type: 'thread-update'; item: ThreadUpdateRenderEvent }
            | {
                  id: string
                  type: 'generic'
                  item: RenderEvent
              }

        const groupByDate = timelineContext?.type === MessageTimelineType.Channel

        const listItems: ListItem[] = flatGroups
            .flatMap<ListItem>((e) => {
                if (e.type === RenderEventType.UserMessages) {
                    // if all consecutive messages are encrypted, we can group them
                    const displayEncrypted = e.events.every(
                        (e) =>
                            !e.isRedacted &&
                            ((e.content.kind === ZTEvent.RoomMessage &&
                                e.content.msgType === 'm.bad.encrypted') ||
                                e.content.kind === ZTEvent.RoomMessageEncrypted),
                    )
                    // only picks 3 messages (first and last ones) when
                    // decrypted content is showing
                    const filtered = displayEncrypted
                        ? e.events.filter((e, i, events) => i === 0 || i > events.length - 3)
                        : e.events

                    return filtered
                        .map((event, index, events) => {
                            let item:
                                | null
                                | MessageRenderEvent
                                | EncryptedMessageRenderEvent
                                | RedactedMessageRenderEvent

                            // this occurs when a users has mixed encrypted and unencrypted messages
                            const messageDisplayEncrypted =
                                !event.isRedacted &&
                                ((event.content.kind === ZTEvent.RoomMessage &&
                                    event.content.msgType === 'm.bad.encrypted') ||
                                    event.content.kind === ZTEvent.RoomMessageEncrypted)

                            if (isRoomMessage(event)) {
                                item = {
                                    type: RenderEventType.Message,
                                    key: event.eventId,
                                    event,
                                    displayEncrypted: displayEncrypted || messageDisplayEncrypted,
                                    displayContext:
                                        index > 0 ? 'tail' : events.length > 1 ? 'head' : 'single',
                                }
                            } else if (isRedactedRoomMessage(event)) {
                                if (repliesMap?.[event.eventId]) {
                                    item = {
                                        type: RenderEventType.RedactedMessage,
                                        key: event.eventId,
                                        event,
                                        displayEncrypted: false,
                                        displayContext:
                                            index > 0
                                                ? 'tail'
                                                : events.length > 1
                                                ? 'head'
                                                : 'single',
                                    }
                                } else {
                                    item = null
                                }
                            } else {
                                item = {
                                    type: RenderEventType.EncryptedMessage,
                                    key: event.eventId,
                                    event,
                                    displayEncrypted: true,
                                    displayContext:
                                        index > 0 ? 'tail' : events.length > 1 ? 'head' : 'single',
                                }
                            }

                            return item
                                ? ({
                                      id: event.eventId,
                                      type: 'message',
                                      item,
                                  } as const)
                                : undefined
                        })
                        .filter(notUndefined)
                }
                return e.type === 'group' && groupByDate
                    ? ({ id: e.key, type: 'group', date: e.date, isNew: e.isNew } as const)
                    : e.type === RenderEventType.FullyRead
                    ? ({ id: e.key, type: 'fully-read', item: e } as const)
                    : e.type === RenderEventType.ThreadUpdate
                    ? ({ id: e.key, type: 'thread-update', item: e } as const)
                    : e.type !== 'group'
                    ? ({ id: e.key, type: 'generic', item: e } as const)
                    : []
            })
            .filter(notUndefined)

        return listItems
    }, [flatGroups, repliesMap, timelineContext?.type])

    const { listItems, numHidden } = useMemo(() => {
        const isThreadOrigin =
            timelineContext?.type === MessageTimelineType.Thread && flatGroups.length > 1

        const listItems = [...allListItems]
        if (timelineContext?.type === MessageTimelineType.Channel) {
            listItems.unshift({ id: 'header', type: 'header' } as const)
        } else if (isThreadOrigin && listItems.length > 1 && listItems[1]?.type !== 'fully-read') {
            listItems.splice(1, 0, { id: 'divider', type: 'divider' } as const)
        }

        /*
         counts chunks of messages backwards, we want to show about the last 2
         for now a chunk is defined as a sequence of messages from the same
         user or an image
        */

        const collapseStats = allListItems.reduceRight(
            (prev, curr, index) => {
                if (curr.type === 'message') {
                    const userId = curr.item.event.sender.id
                    if (
                        // count first chunk
                        typeof prev.collapseEndIndex === undefined ||
                        // count if user changed
                        userId !== prev.lastUserId ||
                        // count if message is an image
                        (!isRedactedRoomMessage(curr.item.event) &&
                            curr.item.event.content.kind === ZTEvent.RoomMessage &&
                            curr.item.event.content.msgType === MessageType.Image)
                    ) {
                        prev.chunkCount++
                        prev.lastUserId = userId
                    }
                }
                if (prev.chunkCount <= 2) {
                    // index until which collapsed section ends
                    prev.collapseEndIndex = index
                }
                return prev
            },
            {
                chunkCount: 0,
                collapseEndIndex: 1,
                lastUserId: undefined,
            } as {
                chunkCount: number
                collapseEndIndex: number
                lastUserId: string | undefined
            },
        )

        const numHidden = collapseStats.collapseEndIndex - 1 // not counting parent message
        // no need to collapse if there's only 1 hidden message
        if (isCollapsed && collapseStats.collapseEndIndex && numHidden > 1) {
            listItems.splice(1, collapseStats.collapseEndIndex, {
                id: 'expanded',
                type: 'expander',
            })
        }

        return { listItems, numHidden }
    }, [allListItems, flatGroups.length, isCollapsed, timelineContext?.type])

    const hasUnreadMarker = fullyPersistedRef.current
    const [isUnreadMarkerFaded, setIsUnreadMarkerFaded] = useState(false)

    // discard glitches when consecutive messages are decrypted
    const debouncedListItems = useDebounce(listItems, 300)

    useEffect(() => {
        if (hasUnreadMarker) {
            const timeout = setTimeout(() => {
                setIsUnreadMarkerFaded(true)
            }, 3000)
            return () => {
                clearTimeout(timeout)
            }
        }
    }, [hasUnreadMarker])

    const groupIds = useMemo(
        () =>
            debouncedListItems.reduce((groupIds, item) => {
                if (item.type === 'group') {
                    groupIds.push(item.id)
                }
                return groupIds
            }, [] as string[]),
        [debouncedListItems],
    )

    return (
        <VList
            debug={false}
            containerRef={props.containerRef}
            key={channelId?.networkId}
            highlightId={props.highlightId}
            esimtateItemSize={estimateItemHeight}
            list={debouncedListItems}
            groupIds={groupIds}
            itemRenderer={(r, ref) => {
                return r.type === 'header' ? (
                    <>{props.header}</>
                ) : r.type === 'group' ? (
                    <DateDivider
                        label={r.date}
                        ref={ref}
                        new={r.isNew}
                        faded={isUnreadMarkerFaded}
                    />
                ) : r.type === 'divider' ? (
                    <Box paddingX="md" paddingY="md" display={isTouch ? 'none' : 'flex'}>
                        <Divider space="none" />
                    </Box>
                ) : r.type === 'expander' ? (
                    <Box paddingX="md" paddingY="md">
                        <Divider
                            space="none"
                            fontSize="sm"
                            label={
                                <Box cursor="pointer" onClick={onExpandClick}>
                                    <Paragraph color="accent" size="sm">
                                        show {numHidden} more messages
                                    </Paragraph>
                                </Box>
                            }
                        />
                    </Box>
                ) : r.type === 'fully-read' ? (
                    <NewDivider
                        fullyReadMarker={r.item.event}
                        hidden={r.item.isHidden}
                        faded={isUnreadMarkerFaded}
                        paddingX={
                            timelineContext?.type === MessageTimelineType.Channel ? 'lg' : 'md'
                        }
                        onMarkAsRead={onMarkAsRead}
                    />
                ) : (
                    <MessageTimelineItem
                        itemData={r.item}
                        highlight={r.id === props.highlightId}
                        userId={userId}
                        channelName={channelName}
                        channelEncrypted={isChannelEncrypted}
                    />
                )
            }}
        />
    )
}
