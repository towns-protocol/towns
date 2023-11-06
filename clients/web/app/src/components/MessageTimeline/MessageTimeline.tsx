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
    MessageType,
    TimelineEvent,
    ZTEvent,
    useFullyReadMarker,
    useZionClient,
} from 'use-zion-client'
import { FullyReadMarker } from '@river/proto'
import { uniqBy } from 'lodash'
import { Box, Divider, Paragraph } from '@ui'
import { useExperimentsStore } from 'store/experimentsStore'
import { notUndefined } from 'ui/utils/utils'
import { MessageTimelineItem } from '@components/MessageTimeIineItem/TimelineItem'
import { useDevice } from 'hooks/useDevice'
import { VList } from 'ui/components/VList2/VList'
import { useThrottledValue } from 'hooks/useThrottledValue'
import { useVisualViewportContext } from '@components/VisualViewportContext/VisualViewportContext'
import { MessageTimelineContext, MessageTimelineType } from './MessageTimelineContext'
import { DateDivider } from '../MessageTimeIineItem/items/DateDivider'
import { NewDivider } from '../MessageTimeIineItem/items/NewDivider'
import {
    EncryptedMessageRenderEvent,
    MessageRenderEvent,
    RedactedMessageRenderEvent,
    RenderEventType,
    getEventsByDate,
    isRedactedRoomMessage,
    isRoomMessage,
} from './util/getEventsByDate'
import { ListItem } from './types'
import { useFocusMessage } from './hooks/useFocusItem'

type Props = {
    prepend?: JSX.Element
    header?: JSX.Element
    align: 'top' | 'bottom'
    highlightId?: string
    collapsed?: boolean
    containerRef?: MutableRefObject<HTMLDivElement | null>
    groupByUser?: boolean
    displayAsSimpleList?: boolean
}

const emptyTimeline: TimelineEvent[] = []

export const MessageTimeline = (props: Props) => {
    const { groupByUser = true, displayAsSimpleList: displaySimpleList = false } = props
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

    const _events = useMemo(() => {
        return uniqBy(timelineContext?.events ?? emptyTimeline, (t) => t.eventId)
    }, [timelineContext?.events])

    const isStartupRef = useRef(true)

    const events = useThrottledValue(_events, isStartupRef.current ? 0 : 500)

    if (events.length > 0) {
        isStartupRef.current = false
    }

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

    useEffect(() => {
        if (fullyReadPersisted) {
            // ensure a receipt can be sent if the fully-read marker gets replaced
            isSentRef.current = false
        }
    }, [fullyReadPersisted])

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
        () =>
            getEventsByDate(
                events,
                fullyReadPersisted,
                isThread,
                repliesMap,
                experiments,
                groupByUser,
            ),
        [events, fullyReadPersisted, isThread, repliesMap, experiments, groupByUser],
    )

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    //                                    estimate height of blocks before they get rendered

    const estimateItemHeight = useCallback((r: ListItem) => {
        if (r.type === 'user-messages') {
            const height = r.item.events.reduce((height, item) => {
                const itemHeight =
                    !item.isRedacted &&
                    item.content.kind === ZTEvent.RoomMessage &&
                    item.content.msgType === MessageType.Image
                        ? 400
                        : 60
                return height + itemHeight
            }, 0)
            return height
        }
        if (r.type === 'message') {
            const height = [r.item.event].reduce((height, item) => {
                const itemHeight =
                    isRoomMessage(item) && item.content.msgType === MessageType.Image ? 400 : 60
                return height + itemHeight
            }, 0)
            return height
        }
        if (r.type === 'divider') {
            return 50
        }
        return 50
    }, [])

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    //                                                               group and filter events

    const flatGroups = useMemo(
        () =>
            dateGroups.flatMap((f, groupIndex) => {
                const flattened = [
                    {
                        type: 'group',
                        date: f.date.humanDate,
                        isNew: f.isNew,
                        key: f.key,
                    } as const,
                    ...f.events,
                ]

                // positions the channel intro at the top before date groups
                if (groupIndex === 0) {
                    const createRoomEventIndex = flattened.findIndex(
                        (e) => e.type === RenderEventType.RoomCreate,
                    )
                    if (createRoomEventIndex > -1) {
                        // puts the create event at top before the date group
                        flattened.unshift(flattened.splice(createRoomEventIndex, 1)[0])
                    }
                }

                return flattened
            }),
        [dateGroups],
    )

    const lastMessageOnInitIdRef = useRef<string>()

    const allListItems = useMemo(() => {
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
                                    displayContext: getMessageDisplayContext(index, events.length),
                                }
                            } else if (isRedactedRoomMessage(event)) {
                                if (repliesMap?.[event.eventId]) {
                                    item = {
                                        type: RenderEventType.RedactedMessage,
                                        key: event.eventId,
                                        event,
                                        displayEncrypted: false,
                                        displayContext: getMessageDisplayContext(
                                            index,
                                            events.length,
                                        ),
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
                                    displayContext: getMessageDisplayContext(index, events.length),
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

        if (!lastMessageOnInitIdRef.current && allListItems.length > 0) {
            // keep track of the last message when opening the timeline, this marker
            // enables us to figure which messages are to be considered as new
            lastMessageOnInitIdRef.current = allListItems[allListItems.length - 1]?.id
        }
        const collapseStats = allListItems.reduceRight(
            (prev, curr, index) => {
                if (curr.type === 'message') {
                    if (groupByUser) {
                        const userId = curr.item.event.sender.id
                        const date = Math.floor(
                            curr.item.event.createdAtEpocMs / (1000 * 60 * 60 * 24),
                        )
                        if (
                            // count first chunk
                            typeof prev.collapseEndIndex === undefined ||
                            // count if user changed
                            userId !== prev.lastUserId ||
                            date !== prev.lastDate ||
                            // count if message is an image
                            (!isRedactedRoomMessage(curr.item.event) &&
                                curr.item.event.content.kind === ZTEvent.RoomMessage &&
                                curr.item.event.content.msgType === MessageType.Image)
                        ) {
                            prev.chunkCount++
                            prev.lastUserId = userId
                            prev.lastDate = date
                        }
                    } else {
                        // anything after the last message is considered new
                        // and I guess we want to show it, once the the last
                        // message has been reached we count count 2 messages
                        // and collapse
                        if (curr.id === lastMessageOnInitIdRef.current) {
                            prev.isNewMessage = false
                        }

                        if (!prev.isNewMessage || !lastMessageOnInitIdRef.current) {
                            prev.chunkCount++
                        }
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
                lastDate: undefined,
                isNewMessage: true,
            } as {
                chunkCount: number
                collapseEndIndex: number
                lastUserId: string | undefined
                lastDate: number | undefined
                isNewMessage: boolean
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
    }, [allListItems, flatGroups.length, groupByUser, isCollapsed, timelineContext?.type])

    const hasUnreadMarker = fullyPersistedRef.current
    const [isUnreadMarkerFaded, setIsUnreadMarkerFaded] = useState(false)

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
            listItems.reduce((groupIds, item) => {
                if (item.type === 'group') {
                    groupIds.push(item.id)
                }
                return groupIds
            }, [] as string[]),
        [listItems],
    )

    const { focusItem } = useFocusMessage(listItems, props.highlightId, userId)

    const { visualViewportScrolled: tabBarHidden } = useVisualViewportContext()

    const itemRenderer = useCallback(
        (r: ListItem, measureRef?: React.RefObject<HTMLDivElement> | undefined) => {
            return r.type === 'header' ? (
                <>{props.prepend}</>
            ) : r.type === 'group' ? (
                <DateDivider
                    label={r.date}
                    ref={measureRef}
                    new={r.isNew}
                    faded={isUnreadMarkerFaded}
                />
            ) : r.type === 'divider' ? (
                <Box paddingX="md" paddingY="md" display={isTouch ? 'none' : 'flex'}>
                    <Divider space="none" />
                </Box>
            ) : r.type === 'expander' ? (
                <Box paddingX="md" paddingY="md">
                    <Box cursor="pointer" onClick={onExpandClick}>
                        <Paragraph color="accent">Show {numHidden} more messages</Paragraph>
                    </Box>
                </Box>
            ) : r.type === 'fully-read' ? (
                <NewDivider
                    fullyReadMarker={r.item.event}
                    hidden={r.item.isHidden}
                    faded={isUnreadMarkerFaded}
                    paddingX={timelineContext?.type === MessageTimelineType.Channel ? 'lg' : 'md'}
                    onMarkAsRead={onMarkAsRead}
                />
            ) : r.item.type === RenderEventType.RoomCreate ? (
                props.header ?? <></>
            ) : (
                <MessageTimelineItem
                    itemData={r.item}
                    highlight={r.id === props.highlightId}
                    userId={userId}
                    channelName={channelName}
                    channelEncrypted={isChannelEncrypted}
                />
            )
        },
        [
            props.prepend,
            props.header,
            props.highlightId,
            isUnreadMarkerFaded,
            isTouch,
            onExpandClick,
            numHidden,
            timelineContext?.type,
            onMarkAsRead,
            userId,
            channelName,
            isChannelEncrypted,
        ],
    )

    return displaySimpleList ? (
        <Box paddingY="md">{listItems.map((item) => itemRenderer(item))}</Box>
    ) : (
        <VList
            align={props.align}
            list={listItems}
            padding={16}
            focusItem={focusItem}
            estimateHeight={estimateItemHeight}
            getItemKey={(item) => item?.id}
            getItemFocusable={(item) => item.type === 'user-messages' || item.type === 'message'}
            scrollContainerRef={props.containerRef}
            key={channelId?.networkId}
            groupIds={groupIds}
            pointerEvents={isTouch && tabBarHidden ? 'none' : undefined}
            itemRenderer={itemRenderer}
        />
    )
}

const getMessageDisplayContext = (index: number, total: number) => {
    if (index === 0) {
        return total === 1 ? 'single' : 'head'
    }

    return index === total - 1 ? 'tail' : 'body'
}
