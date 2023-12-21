import { FullyReadMarker } from '@river/proto'
import { isEqual, uniqBy } from 'lodash'
import React, { MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    MessageType,
    TimelineEvent,
    ZTEvent,
    useFullyReadMarker,
    useZionClient,
} from 'use-zion-client'
import { MessageTimelineItem } from '@components/MessageTimeIineItem/TimelineItem'
import { useVisualViewportContext } from '@components/VisualViewportContext/VisualViewportContext'
import { Box, Divider, Paragraph } from '@ui'
import { SECOND_MS } from 'data/constants'
import { useDevice } from 'hooks/useDevice'
import { useExperimentsStore } from 'store/experimentsStore'
import { useStore } from 'store/store'
import { VList } from 'ui/components/VList2/VList'
import { notUndefined } from 'ui/utils/utils'
import { useChannelType } from 'hooks/useChannelType'
import { FullyReadObserver } from '@components/MessageTimeIineItem/items/FullyReadObserver'
import { DateDivider } from '../MessageTimeIineItem/items/DateDivider'
import { NewDivider } from '../MessageTimeIineItem/items/NewDivider'
import { MessageTimelineType, useTimelineContext } from './MessageTimelineContext'
import { useFocusMessage } from './hooks/useFocusItem'
import { ListItem } from './types'
import {
    EncryptedMessageRenderEvent,
    MessageRenderEvent,
    RedactedMessageRenderEvent,
    RenderEventType,
    getEventsByDate,
    isRedactedRoomMessage,
    isRoomMessage,
} from './util/getEventsByDate'

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

const unhandledEventKinds = [ZTEvent.MiniblockHeader, ZTEvent.Fulfillment, ZTEvent.KeySolicitation]

export const MessageTimeline = (props: Props) => {
    const { groupByUser = true, displayAsSimpleList: displaySimpleList = false } = props
    const timelineContext = useTimelineContext()
    const repliesMap = timelineContext?.messageRepliesMap
    const channelId = timelineContext?.channelId
    const isChannelEncrypted = timelineContext?.isChannelEncrypted
    const channelName = timelineContext?.channels.find(
        (c) => c.id.streamId === channelId?.streamId,
    )?.label
    const userId = timelineContext?.userId
    const { isTouch } = useDevice()
    const [isCollapsed, setCollapsed] = useState(props.collapsed ?? false)
    const onExpandClick = useCallback(() => {
        setCollapsed(false)
    }, [])

    const stableEventsRef = useRef<TimelineEvent[]>([])

    const events = useMemo(() => {
        // remove unneeded events
        let filtered = (timelineContext?.events ?? [])
            // strip out unsolicited events (e.g. key solicitations)
            .filter((e) => e.content?.kind && !unhandledEventKinds.includes(e.content?.kind))

        // strip out fresh encrypted events. Optimistically we want to show
        // the decrypted content when ready. However, the bar will appear if
        // it takes to long or if newer messages are getting decrypted
        const lastDecryptedIndex = filtered.findLastIndex(
            (e) => e.content?.kind === ZTEvent.RoomMessage,
        )
        filtered = filtered.filter(
            (e, index) =>
                e.content?.kind !== ZTEvent.RoomMessageEncrypted ||
                index < lastDecryptedIndex ||
                e.createdAtEpocMs < Date.now() - SECOND_MS * 10,
        )
        // remove duplicates - NOTE: this shouldn't happen - but it does
        const result = uniqBy(filtered ?? emptyTimeline, (t) => t.eventId)

        if (isEqual(result, stableEventsRef.current)) {
            // no need to update to mutate and update the UI if the events are the same
            return result
        }

        stableEventsRef.current = result

        return stableEventsRef.current
    }, [timelineContext?.events])

    const isStartupRef = useRef(true)

    if (events.length > 0) {
        isStartupRef.current = false
    }

    let fullyReadMarker = useFullyReadMarker(channelId, timelineContext?.threadParentId)

    if (!fullyReadMarker?.isUnread) {
        // dismiss inactive fullyReadMarkers
        fullyReadMarker = undefined
    }

    const experiments = useExperimentsStore()

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    //

    const isWindowActive = useStore((state) => state.isWindowFocused)

    // if a marker is shown once it will keep displaying until timeline gets
    // unmounted despite the marker flipping to unread
    const [fullreadMarkerPersisted, setFullyReadMarkerPersisted] = useState(() =>
        fullyReadMarker?.isUnread ? fullyReadMarker : undefined,
    )
    const [initialFullyReadMarker] = useState(() =>
        fullyReadMarker?.isUnread ? fullyReadMarker : undefined,
    )

    const isWindowActiveRef = useRef(isWindowActive)
    isWindowActiveRef.current = isWindowActive

    useEffect(() => {
        if (!isWindowActiveRef.current) {
            setFullyReadMarkerPersisted(fullyReadMarker)
            setIsUnreadMarkerFaded(false)
        }
    }, [fullyReadMarker])

    useEffect(() => {
        if (fullyReadMarker?.isUnread) {
            isSentRef.current = false
        }
    }, [fullyReadMarker?.isUnread])

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
    const channelType = useChannelType(channelId)

    const dateGroups = useMemo(
        () =>
            getEventsByDate(
                events,
                channelType,
                fullreadMarkerPersisted?.eventId,
                isThread,
                repliesMap,
                experiments,
                groupByUser,
            ),
        [
            channelType,
            events,
            experiments,
            fullreadMarkerPersisted?.eventId,
            groupByUser,
            isThread,
            repliesMap,
        ],
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
                        (e) => e.type === RenderEventType.ChannelHeader,
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
                            const stableKey = event.localEventId ?? event.eventId
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
                                    key: stableKey,
                                    event,
                                    displayEncrypted: displayEncrypted || messageDisplayEncrypted,
                                    displayContext: getMessageDisplayContext(index, events.length),
                                }
                            } else if (isRedactedRoomMessage(event)) {
                                if (repliesMap?.[event.eventId]) {
                                    item = {
                                        type: RenderEventType.RedactedMessage,
                                        key: stableKey,
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
                                    key: stableKey,
                                    event,
                                    displayEncrypted: true,
                                    displayContext: getMessageDisplayContext(index, events.length),
                                }
                            }

                            return item
                                ? ({
                                      key: stableKey,
                                      type: 'message',
                                      item,
                                  } as const)
                                : undefined
                        })
                        .filter(notUndefined)
                }
                return e.type === 'group' && groupByDate
                    ? ({ key: e.key, type: 'group', date: e.date, isNew: e.isNew } as const)
                    : e.type === RenderEventType.NewDivider
                    ? ({ key: e.key, type: 'new-divider', item: e } as const)
                    : e.type === RenderEventType.ThreadUpdate
                    ? ({ key: e.key, type: 'thread-update', item: e } as const)
                    : e.type !== 'group'
                    ? ({ key: e.key, type: 'generic', item: e } as const)
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
            listItems.unshift({ key: 'header', type: 'header' } as const)
        } else if (isThreadOrigin && listItems.length > 1 && listItems[1]?.type !== 'new-divider') {
            listItems.splice(1, 0, { key: 'divider', type: 'divider' } as const)
        }

        /*
         counts chunks of messages backwards, we want to show about the last 2
         for now a chunk is defined as a sequence of messages from the same
         user or an image
        */

        if (!lastMessageOnInitIdRef.current && allListItems.length > 0) {
            // keep track of the last message when opening the timeline, this marker
            // enables us to figure which messages are to be considered as new
            lastMessageOnInitIdRef.current = allListItems[allListItems.length - 1]?.key
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
                            typeof prev.collapseEndIndex === 'undefined' ||
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
                        if (curr.key === lastMessageOnInitIdRef.current) {
                            prev.isNewMessage = false
                        }

                        if (!prev.isNewMessage || !lastMessageOnInitIdRef.current) {
                            prev.chunkCount++
                        }
                    }
                }

                if (
                    prev.chunkCount <= 2 ||
                    (fullyReadMarker?.isUnread && curr.key === fullyReadMarker?.eventId)
                ) {
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
                key: 'expanded',
                type: 'expander',
            })
        }

        return { listItems, numHidden }
    }, [
        allListItems,
        flatGroups.length,
        fullyReadMarker?.eventId,
        fullyReadMarker?.isUnread,
        groupByUser,
        isCollapsed,
        timelineContext?.type,
    ])

    const hasUnreadMarker = !!fullreadMarkerPersisted
    const [isUnreadMarkerFaded, setIsUnreadMarkerFaded] = useState(false)

    useEffect(() => {
        if (hasUnreadMarker && isWindowActive) {
            const timeout = setTimeout(() => {
                setIsUnreadMarkerFaded(true)
            }, 3000)
            return () => {
                clearTimeout(timeout)
            }
        }
    }, [hasUnreadMarker, isWindowActive])

    const groupIds = useMemo(
        () =>
            listItems.reduce((groupIds, item) => {
                if (item.type === 'group') {
                    groupIds.push(item.key)
                }
                return groupIds
            }, [] as string[]),
        [listItems],
    )

    const { focusItem } = useFocusMessage(
        listItems,
        props.highlightId,
        userId,
        initialFullyReadMarker,
    )

    const { visualViewportScrolled: tabBarHidden } = useVisualViewportContext()

    const itemRenderer = useCallback(
        (r: ListItem, measureRef?: React.RefObject<HTMLDivElement> | undefined) => {
            switch (r.type) {
                case 'header': {
                    return <>{props.prepend}</>
                }
                case 'group': {
                    return (
                        <DateDivider
                            label={r.date}
                            ref={measureRef}
                            new={r.isNew}
                            faded={isUnreadMarkerFaded}
                        />
                    )
                }
                case 'divider': {
                    return (
                        <Box paddingX="md" paddingY="md" display={isTouch ? 'none' : 'flex'}>
                            <Divider space="none" />
                        </Box>
                    )
                }
                case 'expander': {
                    return (
                        <Box paddingX="md" paddingY="md">
                            <Box cursor="pointer" onClick={onExpandClick}>
                                <Paragraph color="default">
                                    Show {numHidden} more messages
                                </Paragraph>
                            </Box>
                        </Box>
                    )
                }
                case 'new-divider': {
                    return (
                        <NewDivider
                            faded={isUnreadMarkerFaded}
                            paddingX={
                                timelineContext?.type === MessageTimelineType.Channel ? 'lg' : 'md'
                            }
                        />
                    )
                }

                default: {
                    if (r.item.type === RenderEventType.ChannelHeader) {
                        return props.header ?? <></>
                    }

                    const message = (
                        <MessageTimelineItem
                            itemData={r.item}
                            highlight={r.key === props.highlightId}
                            userId={userId}
                            channelName={channelName}
                            channelEncrypted={isChannelEncrypted}
                        />
                    )

                    return fullyReadMarker?.eventId === r.key ? (
                        <>
                            <FullyReadObserver
                                fullyReadMarker={fullyReadMarker}
                                onMarkAsRead={onMarkAsRead}
                            />
                            {message}
                        </>
                    ) : (
                        message
                    )
                }
            }
        },
        [
            channelName,
            fullyReadMarker,
            isChannelEncrypted,
            isTouch,
            isUnreadMarkerFaded,
            numHidden,
            onExpandClick,
            onMarkAsRead,
            props.header,
            props.highlightId,
            props.prepend,
            timelineContext?.type,
            userId,
        ],
    )

    const offscreenMarker = useMemo(() => {
        return (
            <Box padding="lg">
                <Box
                    horizontal
                    centerContent
                    paddingY="md"
                    paddingX="lg"
                    gap="sm"
                    rounded="lg"
                    cursor="pointer"
                    background="cta1"
                    boxShadow="medium"
                >
                    <Paragraph fontWeight="medium">New messages</Paragraph>
                    <Paragraph fontWeight="medium">↓</Paragraph>
                </Box>
            </Box>
        )
    }, [])

    return displaySimpleList ? (
        <Box paddingY="md">{listItems.map((item) => itemRenderer(item))}</Box>
    ) : (
        <Box grow position="relative" justifyContent="end">
            <VList
                overscan={3}
                align={props.align}
                list={listItems}
                padding={16}
                focusItem={focusItem}
                estimateHeight={estimateItemHeight}
                getItemKey={(item) => item.key}
                getItemFocusable={(item) =>
                    item.type === 'user-messages' ||
                    item.type === 'message' ||
                    item.type === 'header'
                }
                containerRef={props.containerRef}
                key={channelId?.streamId}
                groupIds={groupIds}
                pointerEvents={isTouch && tabBarHidden ? 'none' : undefined}
                itemRenderer={itemRenderer}
                offscreenMarker={offscreenMarker}
            />
        </Box>
    )
}

const getMessageDisplayContext = (index: number, total: number) => {
    if (index === 0) {
        return total === 1 ? 'single' : 'head'
    }

    return index === total - 1 ? 'tail' : 'body'
}
