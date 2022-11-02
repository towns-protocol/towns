import { useEffect, useState } from 'react'
import { Membership } from '../../types/matrix-types'
import {
    ClientEvent,
    HistoryVisibility,
    IRoomTimelineData,
    JoinRule,
    MatrixClient,
    MatrixEvent,
    MatrixEventEvent,
    RelationType,
    RestrictedAllowType,
    Room as MatrixRoom,
    RoomEvent,
} from 'matrix-js-sdk'
import { enrichPowerLevels } from '../../client/matrix/PowerLevels'
import { TimelineEvent, TimelineEvent_OneOf, ZTEvent } from '../../types/timeline-types'
import { staticAssertNever } from '../../utils/zion-utils'

export function useMatrixTimelines(client?: MatrixClient): Record<string, TimelineEvent[]> {
    const [timelines, setTimelines] = useState<Record<string, TimelineEvent[]>>({})

    useEffect(() => {
        // check preconditions
        if (!client) {
            return
        }
        // helpers
        const removeEvent = (roomId: string, eventId: string) => {
            setTimelines((timelines) => ({
                ...timelines,
                [roomId]: timelines[roomId]?.filter((event) => event.eventId !== eventId) ?? [],
            }))
        }
        const appendEvent = (roomId: string, timelineEvent: TimelineEvent) => {
            setTimelines((timelines) => ({
                ...timelines,
                [roomId]: [...(timelines[roomId] ?? []), timelineEvent],
            }))
        }
        const prependEvent = (roomId: string, timelineEvent: TimelineEvent) => {
            setTimelines((timelines) => ({
                ...timelines,
                [roomId]: [timelineEvent, ...(timelines[roomId] ?? [])],
            }))
        }
        const replaceEvent = (
            roomId: string,
            replacingId: string,
            timelineEvent: TimelineEvent,
        ) => {
            setTimelines((timelines) => {
                const timeline = timelines[roomId] ?? []
                const eventIndex = timeline.findIndex(
                    (value: TimelineEvent) => value.eventId === replacingId,
                )
                if (eventIndex === -1) {
                    return timelines
                }
                const event = timeline[eventIndex]

                return {
                    ...timelines,
                    [roomId]: [
                        ...timeline.slice(0, eventIndex),
                        toReplacedMessageEvent(event, timelineEvent),
                        ...timeline.slice(eventIndex + 1),
                    ],
                }
            })
        }
        const initRoomTimeline = (room: MatrixRoom) => {
            setTimelines((timelines) => ({
                ...timelines,
                [room.roomId]: toTimelineEvents(room),
            }))
        }

        const initTimelines = () => {
            // initial state, for some reason the timeline doesn't filter replacements
            const timelines = client
                .getRooms()
                .reduce((acc: Record<string, TimelineEvent[]>, room: MatrixRoom) => {
                    acc[room.roomId] = toTimelineEvents(room)
                    return acc
                }, {} as Record<string, TimelineEvent[]>)
            setTimelines(timelines)
        }

        initTimelines()

        const onRoomTimelineEvent = (
            event: MatrixEvent,
            eventRoom: MatrixRoom,
            toStartOfTimeline: boolean,
            removed: boolean,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            data: IRoomTimelineData,
        ) => {
            const roomId = eventRoom.roomId
            const timelineEvent = toEvent(event)
            if (removed) {
                removeEvent(roomId, event.getId())
            } else if (event.isRelation(RelationType.Replace)) {
                const replacingId = event.getWireContent()['m.relates_to']?.event_id
                if (replacingId) {
                    replaceEvent(roomId, replacingId, timelineEvent)
                }
            } else if (toStartOfTimeline) {
                prependEvent(roomId, timelineEvent)
            } else {
                appendEvent(roomId, timelineEvent)
            }
            // handle local id replacement
            if (timelineEvent.isLocalPending) {
                event.once(MatrixEventEvent.LocalEventIdReplaced, () => {
                    replaceEvent(roomId, timelineEvent.eventId, toEvent(event))
                })
            }
        }

        const onEventDecrypted = (event: MatrixEvent) => {
            const roomId = event.getRoomId()
            if (!roomId) {
                return
            }
            replaceEvent(roomId, event.getId(), toEvent(event))
        }

        const onRoomRedaction = (event: MatrixEvent, eventRoom: MatrixRoom) => {
            if (!event.event.redacts) {
                console.error('redaction event has no redacts field')
                return
            }
            removeEvent(eventRoom.roomId, event.event.redacts)
        }

        const onEventReplaced = (event: MatrixEvent) => {
            const roomId = event.getRoomId()
            if (!roomId) {
                return
            }
            const replacingId = event.replacingEventId()
            if (!replacingId) {
                return
            }
            if (replacingId.startsWith('')) {
                // console.log("ignoring local event replaced");
                // will swap out the id in the LocalEventIdReplaced listener
                return
            }
            replaceEvent(roomId, replacingId, toEvent(event))
        }

        const onRoomEvent = (room: MatrixRoom) => {
            initRoomTimeline(room)
        }

        console.log("useMatrixTimelines: adding listeners to client's rooms")
        client.on(ClientEvent.Room, onRoomEvent)
        client.on(RoomEvent.Timeline, onRoomTimelineEvent)
        client.on(RoomEvent.Redaction, onRoomRedaction)
        // cli.on(RoomEvent.TimelineReset, this.onRoomTimelineReset);
        // cli.on(RoomEvent.RedactionCancelled, this.onRoomRedaction);
        client.on(MatrixEventEvent.Decrypted, onEventDecrypted)
        client.on(MatrixEventEvent.Replaced, onEventReplaced)
        return () => {
            console.log("useMatrixTimelines: removing listeners from client's rooms")
            client.off(ClientEvent.Room, onRoomEvent)
            client.off(RoomEvent.Timeline, onRoomTimelineEvent)
            client.off(RoomEvent.Redaction, onRoomRedaction)
            client.off(MatrixEventEvent.Decrypted, onEventDecrypted)
            client.off(MatrixEventEvent.Replaced, onEventReplaced)
            setTimelines({})
        }
    }, [client])

    return timelines
}

export function toEvent(event: MatrixEvent): TimelineEvent {
    const { content, error } = toZionContent(event)
    const fbc = `${event.getType()} ${getFallbackContent(event, content, error)}`
    // console.log("!!!! to event", event.getId(), fbc);
    return {
        eventId: event.getId(),
        eventType: event.getType(),
        originServerTs: event.getTs(),
        content: content,
        fallbackContent: fbc,
        isLocalPending: event.getId().startsWith('~'),
    }
}

function toZionContent(event: MatrixEvent): {
    content?: TimelineEvent_OneOf
    error?: string
} {
    const describe = () => {
        return `${event.getType()} id: ${event.getId()}`
    }
    const content = event.getContent()
    const eventType = event.getType() as ZTEvent

    switch (eventType) {
        case ZTEvent.Reaction: {
            const relation = event.getRelation()
            const targetEventId = relation?.event_id
            const reaction = relation?.key
            if (!targetEventId || !reaction) {
                return {
                    error: `${describe()} invalid reaction event`,
                }
            }
            return {
                content: {
                    kind: eventType,
                    sender: {
                        id: event.getSender(),
                        displayName: event.sender?.rawDisplayName ?? event.getSender(),
                        avatarUrl: event.sender.getMxcAvatarUrl() ?? undefined,
                    },
                    targetEventId: targetEventId,
                    reaction: reaction,
                },
            }
        }
        case ZTEvent.RoomAvatar:
            return {
                content: {
                    kind: eventType,
                    url: content.url as string,
                },
            }
        case ZTEvent.RoomCanonicalAlias:
            return {
                content: {
                    kind: eventType,
                    alias: content.alias as string,
                    altAliases: content.alt_aliases as string[] | undefined,
                },
            }
        case ZTEvent.RoomCreate:
            return {
                content: {
                    kind: eventType,
                    creator: content.creator as string,
                    predecessor: content.predecessor as {
                        event_id: string
                        room_id: string
                    },
                    type: content.type as string | undefined,
                },
            }
        case ZTEvent.RoomEncrypted:
            return {
                content: {
                    kind: eventType,
                },
            }
        case ZTEvent.RoomHistoryVisibility: {
            const visibility = content.history_visibility as HistoryVisibility
            if (!visibility) {
                return {
                    error: `${describe()} event has no history_visibility`,
                }
            }
            return {
                content: {
                    kind: eventType,
                    historyVisibility: visibility,
                },
            }
        }
        case ZTEvent.RoomJoinRules:
            return {
                content: {
                    kind: eventType,
                    joinRule: content.join_rule as JoinRule,
                    allow: content.allow as
                        | { room_id: string; type: RestrictedAllowType }[]
                        | undefined,
                },
            }
        case ZTEvent.RoomName:
            return {
                content: {
                    kind: eventType,
                    name: content.name as string,
                },
            }
        case ZTEvent.RoomMember: {
            const memberId = event.getStateKey()
            if (!memberId) {
                return {
                    error: `${describe()} has no state key`,
                }
            }
            return {
                content: {
                    kind: eventType,
                    userId: memberId,
                    avatarUrl: content.avatar_url,
                    displayName: content.displayname,
                    isDirect: !!content.is_direct,
                    membership: content.membership as Membership,
                    reason: content.reason as string | undefined,
                },
            }
        }
        case ZTEvent.RoomMessage: {
            if (!event.getSender() || !content.msgtype) {
                return {
                    error: `${describe()} has no sender, or msgtype`,
                }
            }
            return {
                content: {
                    kind: eventType,
                    sender: {
                        id: event.getSender(),
                        displayName: event.sender?.rawDisplayName ?? event.getSender(),
                        avatarUrl: event.sender.getMxcAvatarUrl() ?? undefined,
                    },
                    inReplyTo: event.replyEventId,
                    body: content.body as string,
                    msgType: content.msgtype,
                    content: content,
                },
            }
        }
        case ZTEvent.RoomPowerLevels:
            return {
                content: {
                    kind: eventType,
                    ...enrichPowerLevels(content),
                },
            }
        case ZTEvent.RoomRedaction: {
            if (!event.getSender()) {
                return {
                    error: `${describe()} has no sender`,
                }
            }
            return {
                content: {
                    kind: eventType,
                    sender: {
                        id: event.getSender(),
                        displayName: event.sender?.rawDisplayName ?? event.getSender(),
                        avatarUrl: event.sender.getMxcAvatarUrl() ?? undefined,
                    },
                    inReplyTo: event.replyEventId,
                    content: content,
                },
            }
        }
        case ZTEvent.SpaceChild: {
            const childId = event.getStateKey()
            if (!childId) {
                return {
                    error: `${describe()} has no state key`,
                }
            }
            return {
                content: {
                    kind: eventType,
                    childId: childId,
                },
            }
        }
        case ZTEvent.SpaceParent: {
            const parentId = event.getStateKey()
            if (!parentId) {
                return {
                    error: `${describe()} has no state key`,
                }
            }
            return {
                content: {
                    kind: eventType,
                    parentId: parentId,
                },
            }
        }

        default:
            console.log(`Unhandled Room.timeline event`, event.getType(), {
                event: event,
                roomId: event.getRoomId(),
            })
            return {
                error: `${describe()} unhandled`,
            }
    }
}

function toReplacedMessageEvent(prev: TimelineEvent, event: TimelineEvent) {
    if (
        event?.content?.kind !== ZTEvent.RoomMessage ||
        prev?.content?.kind !== ZTEvent.RoomMessage ||
        !event.content
    ) {
        return event
    }

    // a newly replaced timeline event retain the `content.inReplyTo` which subsequently
    // detaches it from the thread (until refresh). The following creates a new
    // event with the `inReplyTo` copied from the original event
    return {
        ...event,
        originalServerTs: prev.originServerTs,
        content: {
            ...event.content,
            inReplyTo: prev.content.inReplyTo,
        },
    }
}

function getFallbackContent(
    event: MatrixEvent,
    content?: TimelineEvent_OneOf,
    error?: string,
): string {
    if (error) {
        return error
    }
    if (!content) {
        throw new Error('Either content or error should be defined')
    }
    const eventType = event.getType()
    switch (content.kind) {
        case ZTEvent.Reaction:
            return `${content.sender.displayName} reacted with ${content.reaction} to ${content.targetEventId}`
        case ZTEvent.RoomAvatar:
            return `url: ${content.url ?? 'undefined'}`
        case ZTEvent.RoomCanonicalAlias: {
            const alt = (content.altAliases ?? []).join(', ')
            return `alias: ${content.alias}, alt alaises: ${alt}`
        }
        case ZTEvent.RoomCreate:
            return `type: ${content.type ?? 'none'}`
        case ZTEvent.RoomEncrypted:
            return `~Encrypted~`
        case ZTEvent.RoomHistoryVisibility:
            return `newValue: ${content.historyVisibility}`
        case ZTEvent.RoomJoinRules:
            return `newValue: ${content.joinRule}`
        case ZTEvent.RoomMember: {
            const name = content.displayName ?? content.userId
            const avatar = content.avatarUrl ?? 'none'
            return `[${content.membership}] name: ${name} avatar: ${avatar}`
        }
        case ZTEvent.RoomMessage:
            return `${content.sender.displayName}: ${content.body}`
        case ZTEvent.RoomName:
            return `newValue: ${content.name}`
        case ZTEvent.RoomRedaction:
            return `${content.sender.displayName}: ~Redacted~`
        case ZTEvent.RoomPowerLevels:
            return `${eventType}`
        case ZTEvent.SpaceChild:
            return `childId: ${content.childId}`
        case ZTEvent.SpaceParent:
            return `parentId: ${content.parentId}`
        default:
            staticAssertNever(content)
            return `Unreachable`
    }
}

const toTimelineEvents = (room: MatrixRoom) => {
    return (
        room
            .getLiveTimeline()
            .getEvents()
            ?.filter((m) => !m.isRelation(RelationType.Replace)) ?? []
    ).map(toEvent)
}
