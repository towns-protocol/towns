import {
    EventType,
    MatrixClient,
    MatrixEvent,
    Room as MatrixRoom,
    NotificationCountType,
    RelationType,
    RoomEvent,
} from 'matrix-js-sdk'
import { useEffect } from 'react'
import { FullyReadMarker, TimelineEvent, ZTEvent } from '../../types/timeline-types'
import { useFullyReadMarkerStore } from '../../store/use-fully-read-marker-store'
import { getIdForMatrixEvent, Mention } from '../../types/zion-types'
import { makeRoomIdentifier, RoomIdentifier } from '../../types/room-identifier'
import { TimelineStoreInterface, useTimelineStore } from '../../store/use-timeline-store'
import { ZionAccountDataType, SpaceProtocol } from '../../client/ZionClientTypes'

type LocalEffectState = {
    /// { roomId: { eventId: index in timeline } }
    encryptedEvents: Record<string, Record<string, number>> // this should be a Map instead of a record
}

export function useContentAwareTimelineDiff(matrixClient?: MatrixClient) {
    useEffect(() => {
        if (!matrixClient) {
            return
        }
        const userId = matrixClient.getUserId()
        if (!userId) {
            // can happen on logout
            return
        }
        // state
        let effectState = initOnce(matrixClient, userId)

        // listen to the timeine for changes, diff each change, and update the unread counts
        const onTimelineChange = (
            timelineState: TimelineStoreInterface,
            prev: TimelineStoreInterface,
        ) => {
            effectState = diffTimeline(timelineState, prev, effectState, userId)
        }

        const onRoomAccountDataEvent = (
            event: MatrixEvent,
            room: MatrixRoom,
            prev?: MatrixEvent,
        ) => {
            onRemoteRoomAccountDataEvent(event, room, prev)
        }

        // subscribe
        const unsubTimeline = useTimelineStore.subscribe(onTimelineChange)
        matrixClient.on(RoomEvent.AccountData, onRoomAccountDataEvent)

        // return ability to unsubscribe
        return () => {
            unsubTimeline()
            matrixClient.off(RoomEvent.AccountData, onRoomAccountDataEvent)
        }
    }, [matrixClient])
}

function isCountedAsUnread(event: MatrixEvent, myUserId: string): boolean {
    const eventType = event.getType()
    switch (eventType) {
        case EventType.RoomMessage:
            return event.getSender() !== myUserId && !event.isRelation(RelationType.Replace)
        default:
            return false
    }
}

function isMentioned(event: MatrixEvent, myUserId: string): boolean {
    const eventType = event.getType()
    switch (eventType) {
        case EventType.RoomMessage: {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const mentionsContent = event.getContent()?.['mentions']
            if (mentionsContent) {
                return (mentionsContent as Mention[]).some(
                    (mention: Mention) => mention.userId === myUserId,
                )
            }
            return false
        }
        default:
            return false
    }
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
    return event.content?.kind === ZTEvent.RoomMessageEncrypted
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRoomId(value: any): RoomIdentifier {
    /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
    if (value.matrixRoomId) {
        // aellis: data transform for backwards compatibility, Dec 9, 2022, can remove when we make a new space
        return {
            protocol: SpaceProtocol.Matrix,
            networkId: value.matrixRoomId,
            slug: value.slug,
        }
    } else {
        return {
            protocol: SpaceProtocol.Matrix,
            networkId: value.networkId,
            slug: value.slug,
        }
    }
    /* eslint-enable */
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toFullyReadMarker(value: any): FullyReadMarker {
    return {
        /* eslint-disable @typescript-eslint/no-unsafe-member-access */
        channelId: toRoomId(value.channelId),
        threadParentId: value.threadParentId ? (value.threadParentId as string) : undefined,
        eventId: value.eventId as string,
        eventOriginServerTs: value.eventOriginServerTs ? (value.eventOriginServerTs as number) : 0,
        isUnread: value.isUnread as boolean,
        markedReadAtTs: value.markedReadAtTs as number,
        markedUnreadAtTs: value.markedUnreadAtTs as number,
        mentions: value.mentions ? (value.mentions as number) : 0,
        /* eslint-enable */
    }
}

function initOnce(matrixClient: MatrixClient, userId: string): LocalEffectState {
    useFullyReadMarkerStore.setState((state) => {
        const updated = { ...state.markers }
        // loop over all the rooms, get the existing values, get the unread counts, push those into the store
        matrixClient.getRooms().forEach((room) => {
            const remoteMarkers = room.getAccountData(ZionAccountDataType.FullyRead)?.getContent()
            if (remoteMarkers) {
                for (const [key, value] of Object.entries(remoteMarkers)) {
                    const marker = toFullyReadMarker(value)
                    updated[key] = marker
                    console.log('initOnce: setting marker for', { key, marker })
                }
            }

            const unreadCount = room.getUnreadNotificationCount(NotificationCountType.Total) ?? 0
            if (unreadCount > 0) {
                const allEvents = room
                    .getLiveTimeline()
                    .getEvents()
                    .slice(-1 * unreadCount)
                const events = allEvents.filter((event) => isCountedAsUnread(event, userId))
                if (events.length > 0) {
                    const eventsMap = events.reduce((acc, event) => {
                        const parentId = event.replyEventId ?? room.roomId
                        acc[parentId] = [...(acc[parentId] ?? []), event]
                        return acc
                    }, {} as Record<string, MatrixEvent[]>)

                    Object.entries(eventsMap).forEach(([id, events]) => {
                        console.log('new unread events on launch', {
                            unreadCount,
                            id,
                            roomId: room.roomId,
                            events,
                        })
                        const isThread = id !== room.roomId
                        const mentions = events.filter((event) => isMentioned(event, userId)).length
                        let entry: FullyReadMarker = updated[id]
                            ? updated[id]
                            : {
                                  channelId: makeRoomIdentifier(room.roomId),
                                  threadParentId: isThread ? id : undefined,
                                  eventId: getIdForMatrixEvent(events[0]),
                                  eventOriginServerTs: events[0].getTs(),
                                  isUnread: true,
                                  markedUnreadAtTs: Date.now(),
                                  markedReadAtTs: 0,
                                  mentions: 0,
                              }
                        if (!entry.isUnread) {
                            entry = {
                                ...entry,
                                eventId: getIdForMatrixEvent(events[0]),
                                isUnread: true,
                                markedUnreadAtTs: Date.now(),
                                mentions: mentions,
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
            }
        })
        return { markers: updated }
    })

    return {
        encryptedEvents: {},
    }
}

function onRemoteRoomAccountDataEvent(event: MatrixEvent, _room: MatrixRoom, _prev?: MatrixEvent) {
    if (event.getType() === ZionAccountDataType.FullyRead) {
        const remoteMarkers = event.getContent()
        if (remoteMarkers) {
            useFullyReadMarkerStore.setState((state) => {
                let didUpdate = false
                const updated = { ...state.markers }
                for (const [key, value] of Object.entries(remoteMarkers)) {
                    const marker = toFullyReadMarker(value)

                    if (!updated[key] || updated[key].markedReadAtTs < marker.markedReadAtTs) {
                        console.log('onRoomAccountDataEvent: setting marker for', {
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
    }
}

function diffTimeline(
    timelineState: TimelineStoreInterface,
    prev: TimelineStoreInterface,
    effectState: LocalEffectState,
    userId: string,
): LocalEffectState {
    if (Object.keys(prev.timelines).length === 0 || timelineState.timelines === prev.timelines) {
        // noop
        return effectState
    }
    const roomIds = Object.keys(timelineState.timelines)
    roomIds.forEach((roomId) => {
        const encryptedEvents: Record<string, number> = effectState.encryptedEvents[roomId] ?? {}
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
                                if (oldMarker?.isUnread === true) {
                                    // same sate, noop
                                    return state
                                }
                                console.log('adding unread marker for decrypted event', {
                                    id,
                                    event,
                                    oldMarker,
                                })
                                const mentions = isMentionedZTEvent(event) ? 1 : 0
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
                                          eventOriginServerTs: event.originServerTs,
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
                    throw new Error('oops, broken diff algo')
                    console.error('aellis broken diff algo')
                }
            }
            // actual new events
            const diff = events.length - prevEvents.length - startIndex
            if (diff > 0) {
                const newEventsSlice = events.slice(-1 * diff)
                const newEvents = newEventsSlice.filter((event) =>
                    isCountedAsUnreadZTEvent(event, userId),
                )
                if (newEvents.length > 0) {
                    const eventsMap = newEvents.reduce((acc, event) => {
                        const parentId = event.threadParentId ?? roomId
                        acc[parentId] = [...(acc[parentId] ?? []), event]
                        return acc
                    }, {} as Record<string, TimelineEvent[]>)
                    useFullyReadMarkerStore.setState((state) => {
                        const updated = { ...state.markers }
                        Object.entries(eventsMap).forEach(([id, events]) => {
                            const isThread = id !== roomId
                            const mentions = events.filter(isMentionedZTEvent).length
                            console.log('new unread events', { id, roomId, events })
                            let entry: FullyReadMarker = updated[id]
                                ? updated[id]
                                : {
                                      channelId: makeRoomIdentifier(roomId),
                                      threadParentId: isThread ? id : undefined,
                                      eventId: events[0].eventId,
                                      eventOriginServerTs: events[0].originServerTs,
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
                        return { markers: updated }
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
        }
    })
    return effectState
}
