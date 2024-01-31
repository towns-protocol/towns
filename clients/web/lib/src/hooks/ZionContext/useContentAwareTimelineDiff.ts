import { useEffect } from 'react'
import { FullyReadMarker } from '@river/proto'
import {
    Client as CasablancaClient,
    isChannelStreamId,
    isDMChannelStreamId,
    isGDMChannelStreamId,
} from '@river/sdk'
import { TimelineEvent, ZTEvent } from '../../types/timeline-types'
import { useFullyReadMarkerStore } from '../../store/use-fully-read-marker-store'
import { TimelineStore, useTimelineStore } from '../../store/use-timeline-store'
import { check } from '@river/dlog'

export function useContentAwareTimelineDiffCasablanca(casablancaClient?: CasablancaClient) {
    useEffect(() => {
        if (!casablancaClient) {
            return
        }
        const userId = casablancaClient.userId
        if (!userId) {
            // can happen on logout
            return
        }
        let cancelled = false
        // listen to the timeine for changes, diff each change, and update the unread counts
        const onTimelineChange = (timelineState: TimelineStore, prev: TimelineStore) => {
            diffTimeline(timelineState, prev, userId)
        }
        // initialize markers
        const initFulyReadMarkers = async () => {
            if (casablancaClient.userSettingsStreamId) {
                const stream = await casablancaClient.waitForStream(
                    casablancaClient.userSettingsStreamId,
                )
                if (!cancelled) {
                    const markers = stream.view.userSettingsContent.fullyReadMarkers
                    updateFullyReadMarkersFromRemote(markers)
                }
            }
        }
        void initFulyReadMarkers()
        // subscribe
        const unsubTimeline = useTimelineStore.subscribe(onTimelineChange)
        casablancaClient.on('fullyReadMarkersUpdated', fullyReadMarkersUpdated)
        // return ability to unsubscribe
        return () => {
            cancelled = true
            unsubTimeline()
            casablancaClient.off('fullyReadMarkersUpdated', fullyReadMarkersUpdated)
        }
    }, [casablancaClient])
}

function fullyReadMarkersUpdated(
    channelId: string,
    fullyReadMarkers: Record<string, FullyReadMarker>,
) {
    updateFullyReadMarkersFromRemote(new Map([[channelId, fullyReadMarkers]]))
}

/// when we get an update from the server, update our local state
function updateFullyReadMarkersFromRemote(
    fullyReadMarkersMap: Map<string, Record<string, FullyReadMarker>>,
) {
    useFullyReadMarkerStore.setState((state) => {
        let markersUpdated = 0
        const updated = { ...state.markers }
        for (const [_, fullyReadMarkers] of fullyReadMarkersMap) {
            for (const [key, marker] of Object.entries(fullyReadMarkers)) {
                // if we don't have a marker, or if the remote marker has been marked as read more recently than our local marker, update
                if (!updated[key] || updated[key].beginUnreadWindow < marker.beginUnreadWindow) {
                    updated[key] = marker
                    markersUpdated++
                }
            }
        }
        if (markersUpdated > 0) {
            console.log('$ onRoomAccountDataEvent: set markers for ', { markersUpdated })
            return { markers: updated }
        } else {
            return state
        }
    })
}

function diffTimeline(timelineState: TimelineStore, prev: TimelineStore, userId: string) {
    if (Object.keys(prev.timelines).length === 0 || timelineState.timelines === prev.timelines) {
        // noop
        return
    }
    const channelIds = Object.keys(timelineState.timelines).filter(isDiffableStreamTimeline)
    for (const channelId of channelIds) {
        const prevEvents = prev.timelines[channelId] ?? []
        const events = timelineState.timelines[channelId]
        if (prevEvents !== events) {
            useFullyReadMarkerStore.setState((state) => {
                const updated = { ...state.markers }
                const resultReplaced = diffReplaced(
                    channelId,
                    userId,
                    events,
                    timelineState.replacedEvents[channelId] ?? [],
                    prev.replacedEvents[channelId] ?? [],
                    updated,
                )
                const resultAdded = diffAdded(channelId, userId, events, prevEvents, updated)
                if (resultReplaced.didUpdate || resultAdded.didUpdate) {
                    return { markers: updated }
                } else {
                    return state
                }
            })
        }
    }
}

function diffReplaced(
    channelId: string,
    userId: string,
    events: TimelineEvent[],
    replacedEvents: { oldEvent: TimelineEvent; newEvent: TimelineEvent }[],
    prevReplacedEvents: { oldEvent: TimelineEvent; newEvent: TimelineEvent }[],
    updated: { [key: string]: FullyReadMarker },
) {
    // if a replaced event is in the event index window, we need to update mentions and unread
    // replaced is the primary way things get decrypted, so we need to adjust the first unread event
    // and the unread windows for threads
    if (replacedEvents.length === prevReplacedEvents.length) {
        return { didUpdate: false }
    }
    // get the marker for this channel
    const channelMarker = updated[channelId]
    // if we don't have a channel marker, then all changes should get picked up in the added diff
    if (!channelMarker) {
        return { didUpdate: false }
    }
    let didUpdate = false
    for (let i = prevReplacedEvents.length; i < replacedEvents.length; i++) {
        const event = replacedEvents[i]
        // compare the event num against the channel window, not the thread id intentionally
        // because we didn't know the thread id until after the event was decrypted and replaced
        if (event.newEvent.eventNum > channelMarker.endUnreadWindow) {
            // we'll pick this up in the added diff
            continue
        }

        const markerId = event.newEvent.threadParentId ?? channelId
        const marker = updated[markerId]
        if (!marker) {
            didUpdate = true
            // if a marker doesn't exist it usually means we are in a thread and this
            // is the first event in that thread that's been decrypted
            updated[markerId] = {
                channelId: channelId,
                threadParentId: event.newEvent.threadParentId,
                eventId: event.newEvent.eventId,
                eventNum: event.newEvent.eventNum,
                beginUnreadWindow: channelMarker.beginUnreadWindow,
                endUnreadWindow: channelMarker.endUnreadWindow,
                isUnread: isCountedAsUnread(event.newEvent, userId),
                markedReadAtTs: 0n,
                mentions: event.newEvent.isMentioned ? 1 : 0,
            }
            continue
        } else {
            // if we're before the unread window, we don't need to update anything
            if (event.newEvent.eventNum < marker.beginUnreadWindow) {
                continue
            }
            didUpdate = true
            // if the event is in the unread window,
            const wasMentionedBefore = event.oldEvent.isMentioned
            const wasMentionedAfter = event.newEvent.isMentioned
            const mentions =
                wasMentionedBefore === wasMentionedAfter
                    ? marker.mentions
                    : wasMentionedBefore
                    ? marker.mentions - 1
                    : marker.mentions + 1

            const endUnreadWindow = maxBigint(event.newEvent.eventNum, marker.endUnreadWindow)

            if (
                event.newEvent.isRedacted &&
                !event.oldEvent.isRedacted &&
                event.newEvent.eventNum === marker.eventNum
            ) {
                // if the event was redacted, we need to find the first unread event
                const firstUnread = firstUnreadEvent(
                    events,
                    userId,
                    channelId,
                    markerId,
                    marker.beginUnreadWindow,
                    endUnreadWindow,
                )
                const lastEvent = events[events.length - 1]
                updated[markerId] = {
                    ...marker,
                    eventId: firstUnread?.eventId ?? lastEvent.eventId,
                    eventNum: firstUnread?.eventNum ?? lastEvent.eventNum,
                    endUnreadWindow: endUnreadWindow,
                    isUnread: firstUnread !== undefined,
                    mentions: mentions,
                }
            } else {
                // if this is not a redaction it should never move from countsAsUnread to !countsAsUnread
                // meaning we just need to check to see if this is the new first unread event
                const isNewFirstUnread =
                    isCountedAsUnread(event.newEvent, userId) &&
                    (!marker.isUnread || event.newEvent.eventNum <= marker.eventNum)
                const newEventId = isNewFirstUnread ? event.newEvent.eventId : marker.eventId
                const newEventNum = isNewFirstUnread ? event.newEvent.eventNum : marker.eventNum

                updated[markerId] = {
                    ...marker,
                    eventId: newEventId,
                    eventNum: newEventNum,
                    endUnreadWindow: endUnreadWindow,
                    isUnread: marker.isUnread || isNewFirstUnread,
                    mentions: mentions,
                }
            }
        }
    }

    return { didUpdate }
}

function diffAdded(
    channelId: string,
    userId: string,
    events: TimelineEvent[],
    _prevEvents: TimelineEvent[],
    updated: { [key: string]: FullyReadMarker },
) {
    // we we always find the first event
    // we count the mentions in the new events
    // we update the unread window and isUnread
    let didUpdate = false
    const eventsMap: Record<string, TimelineEvent[]> = {}
    const prevEndUnreadWindow = updated[channelId]?.endUnreadWindow ?? -1n
    for (let i = events.length - 1; i >= 0; i--) {
        const event = events[i]
        if (event.eventNum > prevEndUnreadWindow) {
            const parentId = event.threadParentId ?? channelId
            eventsMap[parentId] = [event, ...(eventsMap[parentId] ?? [])]
        }
    }

    Object.entries(eventsMap).forEach(([markerId, eventSegment]) => {
        didUpdate = true
        const isThread = markerId !== channelId
        const prevMarker = updated[markerId]
        const mentions =
            prevMarker?.mentions ?? 0 + eventSegment.filter((e) => e.isMentioned).length
        const beginUnreadWindow = prevMarker?.beginUnreadWindow ?? eventSegment[0].eventNum
        const endUnreadWindow = eventSegment[eventSegment.length - 1].eventNum

        if (beginUnreadWindow > endUnreadWindow) {
            console.log('beginUnreadWindow must be <= endUnreadWindow')
            return
        }

        const firstUnread = firstUnreadEvent(
            events,
            userId,
            channelId,
            markerId,
            beginUnreadWindow,
            endUnreadWindow,
        )
        updated[markerId] = {
            channelId: channelId,
            threadParentId: isThread ? markerId : undefined,
            eventId: firstUnread?.eventId ?? eventSegment[eventSegment.length - 1].eventId,
            eventNum: firstUnread?.eventNum ?? eventSegment[eventSegment.length - 1].eventNum,
            beginUnreadWindow: beginUnreadWindow,
            endUnreadWindow: endUnreadWindow,
            isUnread: firstUnread !== undefined,
            markedReadAtTs: prevMarker?.markedReadAtTs ?? 0n,
            mentions: mentions,
        }
    })

    return { didUpdate }
}

function isCountedAsUnread(event: TimelineEvent, myUserId: string): boolean {
    switch (event.content?.kind) {
        case ZTEvent.RoomMessage:
            return event.sender.id !== myUserId
        default:
            return false
    }
}

function firstUnreadEvent(
    events: TimelineEvent[],
    userId: string,
    channelId: string,
    markerId: string,
    beginWindow: bigint,
    endWindow: bigint,
): TimelineEvent | undefined {
    check(beginWindow <= endWindow, 'beginWindow must be <= endWindow')
    const startIndex = indexOfFirstEventNumEqualToOrGreaterThan(events, beginWindow)
    for (let i = startIndex; i < events.length; i++) {
        const event = events[i]
        const eventMarkerId = event.threadParentId ?? channelId
        if (event.eventNum > endWindow) {
            break
        }
        if (eventMarkerId === markerId && isCountedAsUnread(event, userId)) {
            return event
        }
    }
    return undefined
}

function indexOfFirstEventNumEqualToOrGreaterThan(
    events: TimelineEvent[],
    eventNum: bigint,
): number {
    let low = 0
    let high = events.length - 1

    while (low <= high) {
        const mid = Math.floor((low + high) / 2)

        if (events[mid].eventNum < eventNum) {
            low = mid + 1
        } else if (events[mid].eventNum >= eventNum) {
            // Check if the previous eventNum is also >= to ensure we get the first occurrence
            if (mid === 0 || events[mid - 1].eventNum < eventNum) {
                return mid
            }
            high = mid - 1
        }
    }

    return events.length
}

// Math.max only supports numbers
function maxBigint(x: bigint, y: bigint): bigint {
    return x > y ? x : y
}

function isDiffableStreamTimeline(streamId: string): boolean {
    return (
        isChannelStreamId(streamId) ||
        isDMChannelStreamId(streamId) ||
        isGDMChannelStreamId(streamId)
    )
}
