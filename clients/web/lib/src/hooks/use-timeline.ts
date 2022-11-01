/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useState } from 'react'
import { Membership, RoomIdentifier } from '../types/matrix-types'
import {
    ClientEvent,
    HistoryVisibility,
    IRoomTimelineData,
    JoinRule,
    MatrixEvent,
    MatrixEventEvent,
    RelationType,
    RestrictedAllowType,
    Room as MatrixRoom,
    RoomEvent,
} from 'matrix-js-sdk'
import { useZionContext } from '../components/ZionContextProvider'
import { enrichPowerLevels } from '../client/matrix/PowerLevels'
import { TimelineEvent, TimelineEvent_OneOf, ZTEvent } from '../types/timeline-types'
import { staticAssertNever } from '../utils/zion-utils'

export function useTimeline(roomId?: RoomIdentifier): TimelineEvent[] {
    const { client } = useZionContext()
    const [timeline, setTimeline] = useState<TimelineEvent[]>([])

    useEffect(() => {
        // check preconditions
        if (!client || !roomId) {
            return
        }
        // helpers
        const removeEvent = (eventId: string) => {
            setTimeline((timeline) => timeline.filter((event) => event.eventId !== eventId))
        }
        const appendEvent = (timelineEvent: TimelineEvent) => {
            setTimeline((timeline) => [...timeline, timelineEvent])
        }
        const prependEvent = (timelineEvent: TimelineEvent) => {
            setTimeline((timeline) => [timelineEvent, ...timeline])
        }
        const replaceEvent = (replacingId: string, timelineEvent: TimelineEvent) => {
            setTimeline((timeline) => {
                const eventIndex = timeline.findIndex(
                    (value: TimelineEvent) => value.eventId === replacingId,
                )
                if (eventIndex === -1) {
                    return timeline
                }
                const event = timeline[eventIndex]

                return [
                    ...timeline.slice(0, eventIndex),
                    toReplacedMessageEvent(event, timelineEvent),
                    ...timeline.slice(eventIndex + 1),
                ]
            })
        }

        const initTimeline = () => {
            // initial state
            let initialTimeline = client.getRoom(roomId.matrixRoomId)?.getLiveTimeline().getEvents()
            // for some reason the timeline doesn't filter replacements
            initialTimeline =
                initialTimeline?.filter((m) => !m.isRelation(RelationType.Replace)) ?? []

            setTimeline(initialTimeline.map(toEvent))
        }

        initTimeline()

        const onRoomTimelineEvent = (
            event: MatrixEvent,
            eventRoom: MatrixRoom,
            toStartOfTimeline: boolean,
            removed: boolean,
            data: IRoomTimelineData,
        ) => {
            if (eventRoom.roomId !== roomId.matrixRoomId) {
                return
            }

            const timelineEvent = toEvent(event)
            if (removed) {
                removeEvent(event.getId())
            } else if (event.isRelation(RelationType.Replace)) {
                const replacingId = event.getWireContent()['m.relates_to']?.event_id
                if (replacingId) {
                    replaceEvent(replacingId, timelineEvent)
                }
            } else if (toStartOfTimeline) {
                prependEvent(timelineEvent)
            } else {
                appendEvent(timelineEvent)
            }
            // handle local id replacement
            if (timelineEvent.isLocalPending) {
                event.once(MatrixEventEvent.LocalEventIdReplaced, () => {
                    replaceEvent(timelineEvent.eventId, toEvent(event))
                })
            }
        }

        const onEventDecrypted = (event: MatrixEvent) => {
            if (event.getRoomId() !== roomId.matrixRoomId) {
                return
            }
            replaceEvent(event.getId(), toEvent(event))
        }

        const onRoomRedaction = (event: MatrixEvent, eventRoom: MatrixRoom) => {
            if (eventRoom.roomId !== roomId.matrixRoomId) {
                return
            }
            if (!event.event.redacts) {
                console.error('redaction event has no redacts field')
                return
            }
            removeEvent(event.event.redacts)
        }

        const onEventReplaced = (event: MatrixEvent) => {
            if (event.getRoomId() !== roomId.matrixRoomId) {
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
            replaceEvent(replacingId, toEvent(event))
        }

        const onRoomEvent = (room: MatrixRoom) => {
            if (room.roomId === roomId.matrixRoomId) {
                initTimeline()
            }
        }

        client.on(ClientEvent.Room, onRoomEvent)
        client.on(RoomEvent.Timeline, onRoomTimelineEvent)
        client.on(RoomEvent.Redaction, onRoomRedaction)
        // cli.on(RoomEvent.TimelineReset, this.onRoomTimelineReset);
        // cli.on(RoomEvent.RedactionCancelled, this.onRoomRedaction);
        client.on(MatrixEventEvent.Decrypted, onEventDecrypted)
        client.on(MatrixEventEvent.Replaced, onEventReplaced)
        return () => {
            client.off(ClientEvent.Room, onRoomEvent)
            client.off(RoomEvent.Timeline, onRoomTimelineEvent)
            client.off(RoomEvent.Redaction, onRoomRedaction)
            client.off(MatrixEventEvent.Decrypted, onEventDecrypted)
            client.off(MatrixEventEvent.Replaced, onEventReplaced)
            setTimeline([])
        }
    }, [client, roomId])

    return timeline
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
