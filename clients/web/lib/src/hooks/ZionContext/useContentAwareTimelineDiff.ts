import {
    EventType,
    MatrixClient,
    MatrixEvent,
    Room as MatrixRoom,
    NotificationCountType,
    RelationType,
    RoomEvent,
} from 'matrix-js-sdk'
import { Client as CasablancaClient, isChannelStreamId, isSpaceStreamId } from '@towns/sdk'
import { FullyReadMarkerContent } from '@towns/proto'
import { useEffect } from 'react'
import { FullyReadMarker, TimelineEvent, ZTEvent } from '../../types/timeline-types'
import { useFullyReadMarkerStore } from '../../store/use-fully-read-marker-store'
import { makeRoomIdentifier, RoomIdentifier } from '../../types/room-identifier'
import { TimelineStore, useTimelineStore } from '../../store/use-timeline-store'
import { ZionAccountDataType, SpaceProtocol } from '../../client/ZionClientTypes'
import { isZTimelineEvent } from './useMatrixTimelines'

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
            effectState = diffTimeline(
                timelineState,
                prev,
                effectState,
                userId,
                SpaceProtocol.Casablanca,
            )
        }

        const onChannelUnreadMarkerUpdated = (
            fullyReadMarkers: Record<string, FullyReadMarkerContent>,
        ) => {
            if (fullyReadMarkers) {
                useFullyReadMarkerStore.setState((state) => {
                    let didUpdate = false
                    const updated = { ...state.markers }
                    for (const [key, value] of Object.entries(fullyReadMarkers)) {
                        //TODO: refactor fully read marker createion when we will get rid of Matrix
                        const marker: FullyReadMarker = {
                            channelId: toCasablancaRoomId(value.channelId),
                            threadParentId: value.threadParentId,
                            eventId: value.eventId,
                            eventOriginServerTs: Number(value.eventOriginServerTsEpochMs),
                            isUnread: value.isUnread,
                            markedUnreadAtTs: Number(value.markedUnreadAtTsEpochMs),
                            markedReadAtTs: Number(value.markedReadAtTsEpochMs),
                            mentions: value.mentions ? value.mentions : 0,
                        }
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
        //let effectState = initOnce(matrixClient, userId)
        let firstTime = true
        let effectState: LocalEffectState = {
            encryptedEvents: {},
        }

        // listen to the timeine for changes, diff each change, and update the unread counts
        const onTimelineChange = (timelineState: TimelineStore, prev: TimelineStore) => {
            if (firstTime) {
                effectState = initOnce(matrixClient, userId, timelineState)
                firstTime = false
            }
            effectState = diffTimeline(
                timelineState,
                prev,
                effectState,
                userId,
                SpaceProtocol.Matrix,
            )
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
        protocol: SpaceProtocol.Casablanca,
        networkId: value.networkId,
        slug: value.slug,
    }
    /* eslint-enable */
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRoomId(value: any): RoomIdentifier {
    /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
    return {
        protocol: SpaceProtocol.Matrix,
        networkId: value.networkId,
        slug: value.slug,
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

/// matrix keeps track of how many events we miss while we're gone
/// use the unread count to quickly update our local state when we start up
function initOnce(
    matrixClient: MatrixClient,
    userId: string,
    timelineState: TimelineStore,
): LocalEffectState {
    let effectState: LocalEffectState = {
        encryptedEvents: {},
    }
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
                const unreadMatrixEvents = room
                    .getLiveTimeline()
                    .getEvents()
                    .slice(-1 * unreadCount)

                const firstMatrixEvent = unreadMatrixEvents.find(
                    (e) => isZTimelineEvent(e) && (isCountedAsUnread(e, userId) || e.isEncrypted()),
                )
                if (firstMatrixEvent) {
                    const events = timelineState.timelines[room.roomId] ?? []

                    const firstEventIndex = events.findIndex(
                        (e) => e.eventId === firstMatrixEvent.getId(),
                    )

                    if (firstEventIndex >= 0) {
                        const prev = events.slice(0, firstEventIndex)
                        const result = _diffTimeline(
                            room.roomId,
                            events,
                            prev,
                            0,
                            userId,
                            {},
                            effectState,
                            updated,
                        )
                        effectState = result.effectState
                    }
                }
            }
        })
        return { markers: updated }
    })

    return effectState
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
    timelineState: TimelineStore,
    prev: TimelineStore,
    effectState: LocalEffectState,
    userId: string,
    protocol: SpaceProtocol,
): LocalEffectState {
    if (Object.keys(prev.timelines).length === 0 || timelineState.timelines === prev.timelines) {
        // noop
        return effectState
    }
    const roomIds = Object.keys(timelineState.timelines).filter((x) => matchesProtocol(protocol, x))
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
                                console.log('adding unread marker for decrypted event', {
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
                effectState = result.effectState
                if (result.didUpdate) {
                    return { markers: updated }
                } else {
                    return state
                }
            })
        }
    })
    return effectState
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

function matchesProtocol(protocol: SpaceProtocol, roomId: string): boolean {
    switch (protocol) {
        case SpaceProtocol.Matrix:
            return roomId.startsWith('!') || roomId.startsWith('#')
        case SpaceProtocol.Casablanca:
            return isChannelStreamId(roomId) || isSpaceStreamId(roomId)
        default:
            return false
    }
}
