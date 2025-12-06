import { FullyReadMarker } from '@towns-protocol/proto'
import { TimelinesViewModel } from '../streams/timelinesModel'
import { isChannelStreamId, isDMChannelStreamId, isGDMChannelStreamId } from '../../id'
import { RiverTimelineEvent, TimelineEvent } from '../models/timelineTypes'
import { check, dlogger } from '@towns-protocol/utils'

const console = dlogger('csb:unreadMarkersTransform')

type Input = {
    userId: string
    myRemoteFullyReadMarkers: Record<
        string,
        Record<string, FullyReadMarker | undefined> | undefined // entries in the map should never be undefined, type as such to avoid undefined on mission keys
    >
    timelinesView: TimelinesViewModel
}

export type UnreadMarkersModel = {
    markers: Record<string, FullyReadMarker>
    // Phase 3: Track last seen mention status for delta calculation across edits
    lastSeenMentionStatus: Record<string, Record<string, boolean>> // streamId -> eventId -> wasMentioned
}

export function unreadMarkersTransform(
    value: Input,
    prev: Input,
    state?: UnreadMarkersModel,
): UnreadMarkersModel {
    //console.log('unreadMarkersTransform', value, prev, state)

    state = state ?? { markers: {}, lastSeenMentionStatus: {} }

    const { userId, myRemoteFullyReadMarkers, timelinesView } = value

    for (const streamId of Object.keys(myRemoteFullyReadMarkers)) {
        const fullyReadMarkers = myRemoteFullyReadMarkers[streamId]
        if (fullyReadMarkers !== prev.myRemoteFullyReadMarkers[streamId]) {
            state = updateFullyReadMarkersFromRemote({ [streamId]: fullyReadMarkers }, state)
        }
    }

    if (timelinesView !== prev.timelinesView) {
        state = diffTimeline(timelinesView, prev.timelinesView, userId, state)
    }

    return state
}

/// when we get an update from the server, update our local state
function updateFullyReadMarkersFromRemote(
    fullyReadMarkersMap: Record<string, Record<string, FullyReadMarker | undefined> | undefined>,
    state: UnreadMarkersModel,
): UnreadMarkersModel {
    let markersUpdated = 0
    const updated = { ...state.markers }
    for (const fullyReadMarkers of Object.values(fullyReadMarkersMap)) {
        for (const [key, marker] of Object.entries(fullyReadMarkers!)) {
            // if we don't have a marker, or if the remote marker has been marked as read more recently than our local marker, update
            if (!updated[key] || updated[key].beginUnreadWindow < marker!.beginUnreadWindow) {
                updated[key] = marker!
                markersUpdated++
            }
        }
    }
    if (markersUpdated > 0) {
        console.log('$ onRoomAccountDataEvent: set markers for ', { markersUpdated })
        return { ...state, markers: updated }
    } else {
        return state
    }
}

function diffTimeline(
    timelineState: TimelinesViewModel,
    prev: TimelinesViewModel,
    userId: string,
    state: UnreadMarkersModel,
): UnreadMarkersModel {
    if (Object.keys(prev.timelines).length === 0 || timelineState.timelines === prev.timelines) {
        // noop
        return state
    }
    const channelIds = Object.keys(timelineState.timelines).filter(isDiffableStreamTimeline)
    for (const channelId of channelIds) {
        const prevEvents = prev.timelines[channelId] ?? []
        const events = timelineState.timelines[channelId]
        if (prevEvents !== events) {
            const updated = { ...state.markers }
            const resultReplaced = diffReplaced(
                channelId,
                userId,
                events,
                timelineState.eventIndex[channelId],
                timelineState.originalEvents[channelId] ?? {},
                timelineState.replacementLog[channelId] ?? [],
                prev.replacementLog[channelId] ?? [],
                updated,
                state.lastSeenMentionStatus,
            )
            const resultAdded = diffAdded(channelId, userId, events, prevEvents, updated)
            if (resultReplaced.didUpdate || resultAdded.didUpdate) {
                state = {
                    markers: updated,
                    lastSeenMentionStatus: resultReplaced.lastSeenMentionStatus,
                }
            }
        }
    }
    return state
}

function diffReplaced(
    channelId: string,
    userId: string,
    events: TimelineEvent[],
    eventIndex: Map<string, number> | undefined,
    originalEvents: Record<string, TimelineEvent>,
    replacementLog: string[],
    prevReplacementLog: string[],
    updated: { [key: string]: FullyReadMarker },
    lastSeenMentionStatus: Record<string, Record<string, boolean>>,
): { didUpdate: boolean; lastSeenMentionStatus: Record<string, Record<string, boolean>> } {
    // Phase 3: Iterate over new entries in replacementLog
    // Use lastSeenMentionStatus to track mention deltas across multiple edits
    if (replacementLog.length === prevReplacementLog.length) {
        return { didUpdate: false, lastSeenMentionStatus }
    }

    // get the marker for this channel
    const channelMarker = updated[channelId]
    // if we don't have a channel marker, then all changes should get picked up in the added diff
    if (!channelMarker) {
        return { didUpdate: false, lastSeenMentionStatus }
    }

    let didUpdate = false
    const newLastSeenMentionStatus = { ...lastSeenMentionStatus }
    if (!newLastSeenMentionStatus[channelId]) {
        newLastSeenMentionStatus[channelId] = {}
    }

    // Process new entries in the log
    for (let i = prevReplacementLog.length; i < replacementLog.length; i++) {
        const eventId = replacementLog[i]

        // Get current event from timeline using O(1) lookup
        const eventIdx = eventIndex?.get(eventId)
        const currentEvent = eventIdx !== undefined ? events[eventIdx] : undefined
        if (!currentEvent) {
            continue
        }

        // Get the last seen mention status (or from original if first time)
        const originalEvent = originalEvents[eventId]
        const wasMentionedBefore =
            newLastSeenMentionStatus[channelId][eventId] ?? originalEvent?.isMentioned ?? false
        const wasMentionedAfter = currentEvent.isMentioned

        // Update last seen status
        newLastSeenMentionStatus[channelId][eventId] = wasMentionedAfter

        // compare the event num against the channel window, not the thread id intentionally
        // because we didn't know the thread id until after the event was decrypted and replaced
        if (currentEvent.eventNum > channelMarker.endUnreadWindow) {
            // we'll pick this up in the added diff
            continue
        }

        const markerId = currentEvent.threadParentId ?? channelId
        const marker = updated[markerId]
        if (!marker) {
            didUpdate = true
            // if a marker doesn't exist it usually means we are in a thread and this
            // is the first event in that thread that's been decrypted
            updated[markerId] = {
                channelId: channelId,
                threadParentId: currentEvent.threadParentId,
                eventId: currentEvent.eventId,
                eventNum: currentEvent.eventNum,
                beginUnreadWindow: channelMarker.beginUnreadWindow,
                endUnreadWindow: channelMarker.endUnreadWindow,
                isUnread: isCountedAsUnread(currentEvent, userId),
                markedReadAtTs: 0n,
                mentions: currentEvent.isMentioned ? 1 : 0,
            }
            continue
        } else {
            // if we're before the unread window, we don't need to update anything
            if (currentEvent.eventNum < marker.beginUnreadWindow) {
                continue
            }
            didUpdate = true

            // Calculate mention delta from last seen status
            const mentions =
                wasMentionedBefore === wasMentionedAfter
                    ? marker.mentions
                    : wasMentionedBefore
                      ? marker.mentions - 1
                      : marker.mentions + 1

            const endUnreadWindow = maxBigint(currentEvent.eventNum, marker.endUnreadWindow)

            // Check if this is a redaction (current is redacted but original wasn't)
            const wasRedactedBefore = originalEvent?.isRedacted ?? false
            if (
                currentEvent.isRedacted &&
                !wasRedactedBefore &&
                currentEvent.eventNum === marker.eventNum
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
                    isCountedAsUnread(currentEvent, userId) &&
                    (!marker.isUnread || currentEvent.eventNum <= marker.eventNum)
                const newEventId = isNewFirstUnread ? currentEvent.eventId : marker.eventId
                const newEventNum = isNewFirstUnread ? currentEvent.eventNum : marker.eventNum

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

    return { didUpdate, lastSeenMentionStatus: newLastSeenMentionStatus }
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
            (prevMarker?.mentions ?? 0) + eventSegment.filter((e) => e.isMentioned).length
        const beginUnreadWindow = prevMarker?.beginUnreadWindow ?? eventSegment[0].eventNum
        const endUnreadWindow = eventSegment[eventSegment.length - 1].eventNum

        if (beginUnreadWindow > endUnreadWindow) {
            console.log('$ beginUnreadWindow must be <= endUnreadWindow')
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
        case RiverTimelineEvent.ChannelMessage:
            return event.sender.id !== myUserId
        case RiverTimelineEvent.ChannelMessageEncrypted:
            return event.sender.id !== myUserId
        case RiverTimelineEvent.ChannelMessageEncryptedWithRef:
            return false
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
