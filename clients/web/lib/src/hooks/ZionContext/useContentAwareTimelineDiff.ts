import { Client as CasablancaClient, isChannelStreamId, isSpaceStreamId } from '@river/sdk'
import { FullyReadMarkerContent } from '@river/proto'
import { useEffect } from 'react'
import { FullyReadMarker, TimelineEvent, ZTEvent } from '../../types/timeline-types'
import { useFullyReadMarkerStore } from '../../store/use-fully-read-marker-store'
import { makeRoomIdentifier, RoomIdentifier } from '../../types/room-identifier'
import { TimelineStore, useTimelineStore } from '../../store/use-timeline-store'

type LocalEffectState = {
    encryptedEvents: Record<string, Record<string, number>> // this should be a Map instead of a record
}
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

        let effectState: LocalEffectState = {
            encryptedEvents: {},
        }

        // listen to the timeine for changes, diff each change, and update the unread counts
        const onTimelineChange = (timelineState: TimelineStore, prev: TimelineStore) => {
            effectState = diffTimeline(timelineState, prev, effectState, userId)
        }

        const onChannelUnreadMarkerUpdated = (
            channelId: string,
            fullyReadMarkers: Record<string, FullyReadMarkerContent>,
        ) => {
            updateFullyReadMarkers(channelId, fullyReadMarkers)
        }

        // initialize markers
        if (casablancaClient.userSettingsStreamId) {
            const markers = casablancaClient.stream(casablancaClient.userSettingsStreamId)?.view
                .userSettingsContent.fullyReadMarkers
            if (markers) {
                markers.forEach((value, key) => {
                    updateFullyReadMarkers(key, value)
                })
            }
        }
        // subscribe
        const unsubTimeline = useTimelineStore.subscribe(onTimelineChange)
        casablancaClient.on('channelUnreadMarkerUpdated', onChannelUnreadMarkerUpdated)
        // return ability to unsubscribe
        return () => {
            unsubTimeline()
            casablancaClient.off('channelUnreadMarkerUpdated', onChannelUnreadMarkerUpdated)
        }
    }, [casablancaClient])
}

function updateFullyReadMarkers(
    _channelId: string,
    fullyReadMarkers: Record<string, FullyReadMarkerContent>,
) {
    useFullyReadMarkerStore.setState((state) => {
        let didUpdate = false
        const updated = { ...state.markers }
        for (const [key, value] of Object.entries(fullyReadMarkers)) {
            //TODO: refactor fully read marker createion when we will get rid of Matrix
            const marker: FullyReadMarker = {
                channelId: toCasablancaRoomId(value.channelId),
                threadParentId: value.threadParentId,
                eventId: value.eventId,
                eventCreatedAtEpocMs: Number(value.eventCreatedAtEpochMs),
                isUnread: value.isUnread,
                markedUnreadAtTs: Number(value.markedUnreadAtEpochMs),
                markedReadAtTs: Number(value.markedReadAtEpochMs),
                mentions: value.mentions ? value.mentions : 0,
            }
            if (!updated[key] || updated[key].markedReadAtTs < marker.markedReadAtTs) {
                console.log('$ onRoomAccountDataEvent: setting marker for', {
                    key,
                    marker,
                })
                updated[key] = marker
                didUpdate = true
            }
        }
        if (didUpdate) {
            return { markers: updated }
        } else {
            return state
        }
    })
}

function isCountedAsUnreadZTEvent(event: TimelineEvent, myUserId: string): boolean {
    switch (event.content?.kind) {
        case ZTEvent.RoomMessage:
            return event.sender.id !== myUserId
        default:
            return false
    }
}

function isMentionedZTEvent(event: TimelineEvent): boolean {
    return event.isMentioned
}

function isEncryptedZTEvent(event: TimelineEvent): boolean {
    // if it's a bad encrypted message, chance that it will get decrypted
    // later so we still want to hold on to it and check it once it's clear
    if (event.content?.kind === ZTEvent.RoomMessage) {
        return event.content?.msgType === 'm.bad.encrypted'
    }
    return event.content?.kind === ZTEvent.RoomMessageEncrypted
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toCasablancaRoomId(value: any): RoomIdentifier {
    /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
    return {
        networkId: value.networkId,
        slug: value.slug,
    }
    /* eslint-enable */
}

function diffTimeline(
    timelineState: TimelineStore,
    prev: TimelineStore,
    effectState: LocalEffectState,
    userId: string,
): LocalEffectState {
    if (Object.keys(prev.timelines).length === 0 || timelineState.timelines === prev.timelines) {
        // noop
        return effectState
    }
    const roomIds = Object.keys(timelineState.timelines).filter(matchesProtocol)
    roomIds.forEach((roomId) => {
        const prevEvents = prev.timelines[roomId] ?? []
        const events = timelineState.timelines[roomId]
        if (prevEvents !== events) {
            // we don't care about prepended events
            let startIndex = 0
            while (
                prevEvents.length > 0 &&
                startIndex < events.length &&
                events[startIndex].eventId != prevEvents[0].eventId
            ) {
                startIndex += 1
            }
            // check the old encrypted events
            const encryptedEvents: Record<string, number> =
                effectState.encryptedEvents[roomId] ?? {}
            const eventIds = Object.keys(encryptedEvents)
            for (const eventId of eventIds) {
                const index = encryptedEvents[eventId] + startIndex
                const event = events[index]
                if (event?.eventId === eventId) {
                    // we found the event
                    if (isEncryptedZTEvent(event)) {
                        // still encrypted update the index
                        encryptedEvents[eventId] = index
                    } else {
                        // not encrypted anymore, remove it
                        delete encryptedEvents[eventId]
                        if (isCountedAsUnreadZTEvent(event, userId)) {
                            // add it to the store
                            useFullyReadMarkerStore.setState((state) => {
                                const id = event.threadParentId ?? roomId
                                const oldMarker: FullyReadMarker | undefined = state.markers[id]

                                const mentions = isMentionedZTEvent(event) ? 1 : 0
                                if (oldMarker?.isUnread === true && mentions === 0) {
                                    // same sate, noop
                                    return state
                                }
                                console.log('$ adding unread marker for decrypted event', {
                                    id,
                                    event,
                                    oldMarker,
                                    mentions,
                                })
                                const entry: FullyReadMarker = oldMarker
                                    ? {
                                          ...oldMarker,
                                          eventId: event.eventId,
                                          isUnread: true,
                                          markedUnreadAtTs: Date.now(),
                                          mentions: oldMarker.mentions + mentions,
                                      }
                                    : {
                                          channelId: makeRoomIdentifier(roomId),
                                          threadParentId: event.threadParentId,
                                          eventId: event.eventId,
                                          eventCreatedAtEpocMs: event.createdAtEpocMs,
                                          isUnread: true,
                                          markedUnreadAtTs: Date.now(),
                                          markedReadAtTs: 0,
                                          mentions,
                                      }

                                return { markers: { ...state.markers, [id]: entry } }
                            })
                        }
                    }
                } else {
                    // throw new Error('oops, broken diff algo')
                    console.error('aellis broken diff algo')
                }
            }
            useFullyReadMarkerStore.setState((state) => {
                const updated = { ...state.markers }
                const result = _diffTimeline(
                    roomId,
                    events,
                    prevEvents,
                    startIndex,
                    userId,
                    encryptedEvents,
                    effectState,
                    updated,
                )
                const resultDeleted = _diffDeleted(
                    roomId,
                    userId,
                    events,
                    timelineState.deletedEvents[roomId] ?? [],
                    prev.deletedEvents[roomId] ?? [],
                    updated,
                )
                const resultReplaced = _diffReplaced(
                    roomId,
                    userId,
                    events,
                    timelineState.replacedEvents[roomId] ?? [],
                    prev.replacedEvents[roomId] ?? [],
                    updated,
                )
                effectState = result.effectState
                if (result.didUpdate || resultDeleted.didUpdate || resultReplaced.didUpdate) {
                    return { markers: updated }
                } else {
                    return state
                }
            })
        }
    })
    return effectState
}

function _diffDeleted(
    roomId: string,
    userId: string,
    events: TimelineEvent[],
    deletedEvents: TimelineEvent[],
    prevDeletedEvents: TimelineEvent[],
    updated: { [key: string]: FullyReadMarker },
): { didUpdate: boolean } {
    if (!updated[roomId]) {
        return { didUpdate: false }
    }

    const diff = deletedEvents.length - prevDeletedEvents.length
    if (diff <= 0) {
        return { didUpdate: false }
    }
    const markedReadAtTs = updated[roomId].markedReadAtTs
    const markedUnreadAtTs = updated[roomId].markedUnreadAtTs

    //Check is there are any unread messages - if no edits and redactions will not change mentions counts or unread flag
    if (markedReadAtTs >= markedUnreadAtTs) {
        return { didUpdate: false }
    }
    //We introduce this variable to avoid unnecessary updates of the state - it will be triggered to true only
    //If below will make changes either in mentions counter or in unread state
    let updateHappened = false

    //First we process mentions update in the loop below
    for (let i = deletedEvents.length - 1; i >= prevDeletedEvents.length; i--) {
        const event = deletedEvents[i]
        const createdAtEpocMs = event.createdAtEpocMs //TODO: we can't depend on createdAtEpocMs for comparing events https://linear.app/hnt-labs/issue/HNT-2292/unread-markers-cant-count-on-timestamps-in-river
        //check this if (markedReadAtTs < markedUnreadAtTs && createdAtEpocMs > markedReadAtTs)
        //if this condition below is false - there no updates for channel unread state and mentions count
        //as currently processed event is in the read section
        if (createdAtEpocMs > markedReadAtTs) {
            //If event that we are deleting has mention - decrement mentions count for the channel
            if (event.isMentioned) {
                updated[roomId].mentions -= 1
                updateHappened = true
            }
        }
    }

    //Next step is update fullyUnreadMarker for the channel
    //We need to iterate over current message events backwards and if there are remaining with the timestamp later than markedReadAtTs - keep unread flag on
    //One of the key factors here is that events array is sorted by timestamp
    const oldIsUnread = updated[roomId].isUnread
    const oldEventId = updated[roomId].eventId
    updated[roomId].isUnread = false
    for (let i = events.length - 1; i >= 0; i--) {
        //if event is not a message from user - skip it
        if (!isCountedAsUnreadZTEvent(events[i], userId)) {
            continue
        }
        //check this if (createdAtEpocMs > markedReadAtTs)
        //if this condition below is false - there no updates for channel unread state and mentions count
        //as currently processed event is in the read section
        if (events[i].createdAtEpocMs > updated[roomId].markedReadAtTs) {
            updated[roomId].eventId = events[i].eventId
            updated[roomId].eventCreatedAtEpocMs = events[i].createdAtEpocMs
            updated[roomId].isUnread = true
        } else {
            //Stop if we are earlier than markedReadAtTs
            break
        }
    }
    updateHappened =
        updateHappened ||
        oldIsUnread !== updated[roomId].isUnread ||
        oldEventId !== updated[roomId].eventId

    return { didUpdate: updateHappened }
}

function _diffReplaced(
    roomId: string,
    userId: string,
    events: TimelineEvent[],
    replacedEvents: { oldEvent: TimelineEvent; newEvent: TimelineEvent }[],
    prevReplacedEvents: { oldEvent: TimelineEvent; newEvent: TimelineEvent }[],
    updated: { [key: string]: FullyReadMarker },
): { didUpdate: boolean } {
    const diff = replacedEvents.length - prevReplacedEvents.length
    if (diff > 0) {
        let updateHappened = false
        if (updated[roomId]) {
            for (let i = prevReplacedEvents.length; i < replacedEvents.length; i++) {
                const event = replacedEvents[i]
                const createdAtEpocMs = event.newEvent.createdAtEpocMs // todo, use something other than timestamps https://linear.app/hnt-labs/issue/HNT-2292/unread-markers-cant-count-on-timestamps-in-river
                const markedReadAtTs = updated[roomId].markedReadAtTs
                const markedUnreadAtTs = updated[roomId].markedUnreadAtTs
                if (markedReadAtTs < markedUnreadAtTs && createdAtEpocMs > markedReadAtTs) {
                    const wasMentionedBefore = event.oldEvent.isMentioned
                    const wasMentionedAfter = event.newEvent.isMentioned
                    // this check
                    // !isEncryptedZTEvent(...)
                    // is required to avoid double counting of mentions if we are replacing
                    // event after it being decrypted
                    if (
                        wasMentionedAfter !== wasMentionedBefore &&
                        !isEncryptedZTEvent(event.oldEvent)
                    ) {
                        if (wasMentionedBefore) {
                            //case of mention is removed
                            updated[roomId].mentions -= 1
                            updateHappened = true
                        } else {
                            //case of mention is added
                            updated[roomId].mentions += 1
                            updateHappened = true
                        }
                    }
                }
            }

            //Next step is update fullyUnreadMarker for the channel
            //We need to iterate over current message events backwards and if there are remaining with the timestamp later than markedReadAtTs - keep unread flag on
            //One of the key factors here is that events array is sorted by timestamp
            const oldIsUnread = updated[roomId].isUnread
            const oldEventId = updated[roomId].eventId
            updated[roomId].isUnread = false
            for (let i = events.length - 1; i >= 0; i--) {
                //if event is not a message from user - skip it
                if (!isCountedAsUnreadZTEvent(events[i], userId)) {
                    continue
                }
                //check this if (createdAtEpocMs > markedReadAtTs)
                //if this condition below is false - there no updates for channel unread state and mentions count
                //as currently processed event is in the read section
                if (events[i].createdAtEpocMs > updated[roomId].markedReadAtTs) {
                    // todo use something other than timestamps https://linear.app/hnt-labs/issue/HNT-2292/unread-markers-cant-count-on-timestamps-in-river
                    updated[roomId].eventId = events[i].eventId
                    updated[roomId].eventCreatedAtEpocMs = events[i].createdAtEpocMs
                    updated[roomId].isUnread = true
                } else {
                    //Stop if we are earlier than markedReadAtTs
                    break
                }
            }
            updateHappened =
                updateHappened ||
                oldIsUnread !== updated[roomId].isUnread ||
                oldEventId !== updated[roomId].eventId
        }
        return { didUpdate: updateHappened }
    }
    return { didUpdate: false }
}

function _diffTimeline(
    roomId: string,
    events: TimelineEvent[],
    prevEvents: TimelineEvent[],
    startIndex: number,
    userId: string,
    encryptedEvents: Record<string, number>,
    effectState: LocalEffectState,
    updated: { [key: string]: FullyReadMarker },
): { effectState: LocalEffectState; didUpdate: boolean } {
    // actual new events
    let didUpdate = false
    const diff = events.length - prevEvents.length - startIndex
    if (diff > 0) {
        const newEventsSlice = events.slice(-1 * diff)
        const newEvents = newEventsSlice.filter((event) => isCountedAsUnreadZTEvent(event, userId))
        if (newEvents.length > 0) {
            didUpdate = true
            const eventsMap = newEvents.reduce((acc, event) => {
                const parentId = event.threadParentId ?? roomId
                acc[parentId] = [...(acc[parentId] ?? []), event]
                return acc
            }, {} as Record<string, TimelineEvent[]>)

            Object.entries(eventsMap).forEach(([id, events]) => {
                const isThread = id !== roomId
                const mentions = events.filter(isMentionedZTEvent).length
                let entry: FullyReadMarker = updated[id]
                    ? updated[id]
                    : {
                          channelId: makeRoomIdentifier(roomId),
                          threadParentId: isThread ? id : undefined,
                          eventId: events[0].eventId,
                          eventCreatedAtEpocMs: events[0].createdAtEpocMs,
                          isUnread: true,
                          markedUnreadAtTs: Date.now(),
                          markedReadAtTs: 0,
                          mentions: 0,
                      }
                if (!entry.isUnread) {
                    entry = {
                        ...entry,
                        eventId: events[0].eventId,
                        isUnread: true,
                        markedUnreadAtTs: Date.now(),
                        mentions,
                    }
                } else if (mentions > 0) {
                    entry = {
                        ...entry,
                        mentions: entry.mentions + mentions,
                    }
                }
                updated[id] = entry
            })
        }

        // check for encrypted events that we need to check for later
        const newEventsStartIndex = events.length - diff
        for (let i = newEventsStartIndex; i < events.length; i++) {
            const event = events[i]
            if (isEncryptedZTEvent(event)) {
                encryptedEvents[event.eventId] = i
            }
        }

        effectState.encryptedEvents[roomId] = encryptedEvents
    }
    return { effectState, didUpdate }
}

function matchesProtocol(roomId: string): boolean {
    return isChannelStreamId(roomId) || isSpaceStreamId(roomId) || true
}
