import { useEffect } from 'react'
import { getIdForMatrixEvent, Membership, Mention } from '../../types/zion-types'
import {
    ClientEvent,
    EventStatus,
    EventType as MatrixEventType,
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
    IContent,
    MsgType as MatrixMsgType,
} from 'matrix-js-sdk'
import { enrichPowerLevels } from '../../client/matrix/PowerLevels'
import {
    BlockchainTransactionEvent,
    getFallbackContent,
    TimelineEvent,
    TimelineEvent_OneOf,
    ZTEvent,
} from '../../types/timeline-types'
import {
    TimelinesMap,
    useTimelineStore,
    getThreadParentId,
    getReactionParentId,
    getIsMentioned,
} from '../../store/use-timeline-store'
import { IRoomEncryption } from 'matrix-js-sdk/lib/crypto/RoomList'

export function useMatrixTimelines(client?: MatrixClient) {
    const setState = useTimelineStore((s) => s.setState)
    useEffect(() => {
        // check preconditions
        if (!client) {
            return
        }
        const userId = client.getUserId()
        if (!userId) {
            // can happen on logout
            return
        }
        const roomIds = new Set<string>()
        // timeline helpers
        const initRoomTimeline = (room: MatrixRoom) => {
            roomIds.add(room.roomId)
            const timelineEvents = toTimelineEvents(room, userId)
            setState.initializeRoom(userId, room.roomId, timelineEvents)
        }

        const initStateData = () => {
            // initial state, for some reason the timeline doesn't filter replacements
            const timelines = client.getRooms().reduce((acc: TimelinesMap, room: MatrixRoom) => {
                roomIds.add(room.roomId)
                acc[room.roomId] = toTimelineEvents(room, userId)
                return acc
            }, {} as TimelinesMap)

            setState.initialize(userId, timelines)
        }

        initStateData()

        const onRoomTimelineEvent = (
            event: MatrixEvent,
            eventRoom: MatrixRoom | undefined,
            toStartOfTimeline: boolean | undefined,
            removed: boolean,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            data: IRoomTimelineData,
        ) => {
            const roomId = event.getRoomId() ?? eventRoom?.roomId
            if (!roomId) {
                return
            }
            roomIds.add(roomId)
            const timelineEvent = toEvent(event, userId)
            const replacedMsgId = getReplacedMessageId(event)
            if (removed) {
                setState.removeEvent(roomId, timelineEvent.eventId)
            } else if (replacedMsgId !== undefined) {
                // if the event is still encrypted, just drop it on the floor, we'll get it later
                if (timelineEvent.content?.kind !== ZTEvent.RoomMessageEncrypted) {
                    setState.replaceEvent(userId, roomId, replacedMsgId, timelineEvent)
                }
            } else if (toStartOfTimeline) {
                setState.prependEvent(userId, roomId, timelineEvent)
            } else {
                setState.appendEvent(userId, roomId, timelineEvent)
            }
            // handle local id replacement
            if (timelineEvent.isLocalPending) {
                event.once(MatrixEventEvent.LocalEventIdReplaced, () => {
                    setState.replaceEvent(
                        userId,
                        roomId,
                        timelineEvent.eventId,
                        toEvent(event, userId),
                    )
                })
                const updateStatusFn = () => {
                    setState.replaceEvent(
                        userId,
                        roomId,
                        timelineEvent.eventId,
                        toEvent(event, userId),
                    )
                    if (
                        event.status === EventStatus.SENT ||
                        event.status === EventStatus.NOT_SENT ||
                        event.status === EventStatus.CANCELLED
                    ) {
                        event.off(MatrixEventEvent.Status, updateStatusFn)
                    }
                }
                event.on(MatrixEventEvent.Status, updateStatusFn)
            }
        }

        const onEventDecrypted = (event: MatrixEvent) => {
            const eventId = event.getId()
            const roomId = event.getRoomId()
            if (!eventId || !roomId) {
                return
            }
            roomIds.add(roomId)
            const replacedMsgId = getReplacedMessageId(event)
            if (replacedMsgId !== undefined) {
                // in most cases, the event will not be in the timeline, so removeEvent will be a no op
                // but for events that are encrypted on app start, we're rendring a stub event which we need to remove
                setState.removeEvent(roomId, eventId)
                // replace the underlying event
                setState.replaceEvent(userId, roomId, replacedMsgId, toEvent(event, userId))
            } else {
                // update the event with the unencrypted content
                setState.replaceEvent(userId, roomId, eventId, toEvent(event, userId))
            }
        }

        const onRoomRedaction = (event: MatrixEvent, eventRoom: MatrixRoom) => {
            if (!event.event.redacts) {
                console.error('redaction event has no redacts field')
                return
            }
            roomIds.add(eventRoom.roomId)
            setState.removeEvent(eventRoom.roomId, event.event.redacts)
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
            roomIds.add(roomId)
            setState.replaceEvent(userId, roomId, replacingId, toEvent(event, userId))
        }

        const onRoomEvent = (room: MatrixRoom) => {
            initRoomTimeline(room)
        }

        console.log("useMatrixTimelines: adding listeners to client's rooms")
        client.on(ClientEvent.Room, onRoomEvent)
        client.on(RoomEvent.Timeline, onRoomTimelineEvent)
        client.on(RoomEvent.Redaction, onRoomRedaction)
        client.on(MatrixEventEvent.Decrypted, onEventDecrypted)
        client.on(MatrixEventEvent.Replaced, onEventReplaced)
        // cli.on(RoomEvent.TimelineReset, this.onRoomTimelineReset);
        // cli.on(RoomEvent.RedactionCancelled, this.onRoomRedaction);
        return () => {
            console.log("useMatrixTimelines: removing listeners from client's rooms")
            client.off(ClientEvent.Room, onRoomEvent)
            client.off(RoomEvent.Timeline, onRoomTimelineEvent)
            client.off(RoomEvent.Redaction, onRoomRedaction)
            client.off(MatrixEventEvent.Decrypted, onEventDecrypted)
            client.off(MatrixEventEvent.Replaced, onEventReplaced)
            setState.reset(Array.from(roomIds))
        }
    }, [client, setState])
}

export function toEvent(event: MatrixEvent, userId: string): TimelineEvent {
    const eventId = getIdForMatrixEvent(event)
    const { content, error } = toZionContent(eventId, event)
    const sender = {
        id: event.getSender() ?? 'UnknownSenderId',
        displayName: event.sender?.rawDisplayName ?? event.getSender() ?? 'Unknown',
        avatarUrl: event.sender?.getMxcAvatarUrl() ?? undefined,
    }
    const isSender = sender.id === userId
    const fbc = `${content?.kind ?? '??'} ${getFallbackContent(sender.displayName, content, error)}`
    // console.log('!!!! to event', { id: event.getId(), fbc, content, mcontent: event.getContent() })
    return {
        eventId: eventId,
        eventNum: 0n,
        status: isSender ? event.status ?? undefined : undefined,
        createdAtEpocMs: event.getTs(),
        updatedAtEpocMs: event.replacingEvent()?.getTs(),
        content: content,
        fallbackContent: fbc,
        isLocalPending: eventId.startsWith('~'),
        threadParentId: getThreadParentId(content),
        reactionParentId: getReactionParentId(content),
        isMentioned: getIsMentioned(content, userId),
        isRedacted: event.isRedacted(),
        sender,
    }
}

function toZionContent(
    eventId: string,
    event: MatrixEvent,
): {
    content?: TimelineEvent_OneOf
    error?: string
} {
    const describe = () => {
        return `${event.getType()} id: ${eventId}`
    }
    const fullContent = event.getContent()
    const content = (fullContent['m.new_content'] as IContent) ?? fullContent
    const eventType = event.getType()

    switch (eventType) {
        case MatrixEventType.Reaction: {
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
                    kind: ZTEvent.Reaction,
                    targetEventId: targetEventId,
                    reaction: reaction,
                },
            }
        }
        case MatrixEventType.RoomAvatar:
            return {
                content: {
                    kind: ZTEvent.RoomAvatar,
                    url: content.url as string,
                },
            }
        case MatrixEventType.RoomCanonicalAlias:
            return {
                content: {
                    kind: ZTEvent.RoomCanonicalAlias,
                    alias: content.alias as string,
                    altAliases: content.alt_aliases as string[] | undefined,
                },
            }
        case MatrixEventType.RoomCreate:
            return {
                content: {
                    kind: ZTEvent.RoomCreate,
                    creator: content.creator as string,
                    predecessor: content.predecessor as {
                        event_id: string
                        room_id: string
                    },
                    type: content.type as string | undefined,
                },
            }
        case MatrixEventType.RoomEncryption: {
            const content = event.getContent<IRoomEncryption>()
            return {
                content: {
                    kind: ZTEvent.RoomEncryption,
                    roomEncryption: {
                        algorithm: content.algorithm,
                        rotationPeriodMs: content.rotation_period_ms,
                        rotationPeriodMsgs: content.rotation_period_msgs,
                    },
                },
            }
        }
        case MatrixEventType.RoomMessageEncrypted:
            return {
                content: {
                    kind: ZTEvent.RoomMessageEncrypted,
                },
            }
        case MatrixEventType.RoomHistoryVisibility: {
            const visibility = content.history_visibility as HistoryVisibility
            if (!visibility) {
                return {
                    error: `${describe()} event has no history_visibility`,
                }
            }
            return {
                content: {
                    kind: ZTEvent.RoomHistoryVisibility,
                    historyVisibility: visibility,
                },
            }
        }
        case MatrixEventType.RoomJoinRules:
            return {
                content: {
                    kind: ZTEvent.RoomJoinRules,
                    joinRule: content.join_rule as JoinRule,
                    allow: content.allow as
                        | { room_id: string; type: RestrictedAllowType }[]
                        | undefined,
                },
            }
        case MatrixEventType.RoomName:
            return {
                content: {
                    kind: ZTEvent.RoomName,
                    name: content.name as string,
                },
            }

        case MatrixEventType.RoomTopic: {
            return {
                content: {
                    kind: ZTEvent.RoomTopic,
                    topic: content.topic as string,
                },
            }
        }

        case MatrixEventType.RoomMember: {
            const memberId = event.getStateKey()
            if (!memberId) {
                return {
                    error: `${describe()} has no state key`,
                }
            }
            return {
                content: {
                    kind: ZTEvent.RoomMember,
                    userId: memberId,
                    avatarUrl: content.avatar_url,
                    displayName: content.displayname,
                    isDirect: !!content.is_direct,
                    membership: content.membership as Membership,
                    reason: content.reason as string | undefined,
                },
            }
        }
        case MatrixEventType.RoomMessage: {
            if (!content.msgtype) {
                return {
                    error: `${describe()} has no sender, or msgtype`,
                }
            }
            return {
                content: {
                    kind: ZTEvent.RoomMessage,
                    inReplyTo: getReplyEventId(event),
                    threadPreview: getThreadPreview(event),
                    body: content.body as string,
                    msgType: content.msgtype,
                    replacedMsgId: getReplacedMessageId(event),
                    content: content,
                    wireContent: event.getWireContent(),
                    mentions: (content['mentions'] as Mention[]) ?? [],
                },
            }
        }
        case MatrixEventType.RoomPowerLevels:
            return {
                content: {
                    kind: ZTEvent.RoomPowerLevels,
                    ...enrichPowerLevels(content),
                },
            }
        case MatrixEventType.RoomRedaction: {
            if (!event.event.redacts) {
                return {
                    error: `${describe()} has no replyEventId`,
                }
            }
            return {
                content: {
                    kind: ZTEvent.RedactionActionEvent,
                    refEventId: event.event.redacts,
                },
            }
        }
        case MatrixEventType.SpaceChild: {
            const childId = event.getStateKey()
            if (!childId) {
                return {
                    error: `${describe()} has no state key`,
                }
            }
            return {
                content: {
                    kind: ZTEvent.SpaceChild,
                    childId: childId,
                },
            }
        }
        case MatrixEventType.SpaceParent: {
            const parentId = event.getStateKey()
            if (!parentId) {
                return {
                    error: `${describe()} has no state key`,
                }
            }
            return {
                content: {
                    kind: ZTEvent.SpaceParent,
                    parentId: parentId,
                },
            }
        }

        case MatrixMsgType.Notice: {
            if (content.kind === ZTEvent.BlockchainTransaction) {
                return {
                    content: {
                        kind: ZTEvent.BlockchainTransaction,
                        content: content as BlockchainTransactionEvent['content'],
                    },
                }
            }
            // else ignore the notice.
            return {
                content: {
                    kind: ZTEvent.Notice,
                    contentKind: content.kind as string,
                    message: `${describe()} is ignored`,
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

function getReplacedMessageId(event: MatrixEvent): string | undefined {
    if (event.isRelation(RelationType.Replace)) {
        const c = event.getWireContent()
        return c['m.relates_to']?.event_id
    }
    return undefined
}

function toTimelineEvents(room: MatrixRoom, userId: string) {
    return (
        room
            .getLiveTimeline()
            .getEvents()
            ?.filter((m) => isZTimelineEvent(m)) ?? []
    ).map((x) => toEvent(x, userId))
}

export function isZTimelineEvent(event: MatrixEvent): boolean {
    return !event.isRelation(RelationType.Replace)
}

/// using custom function to get reply event id becauset the matrix version breaks when replacing a message
function getReplyEventId(event: MatrixEvent): string | undefined {
    const content = event.getContent()
    if (content['m.new_content']) {
        return (content['m.new_content'] as IContent)['m.relates_to']?.['m.in_reply_to']?.event_id
    }
    const mRelatesTo = event.getContent()['m.relates_to'] || event.getWireContent()['m.relates_to']
    return mRelatesTo?.['m.in_reply_to']?.event_id
}

function getThreadPreview(event: MatrixEvent): string | undefined {
    const content = event.getContent()
    return content['threadPreview'] as string | undefined
}
