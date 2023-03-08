import { useEffect } from 'react'
import { getIdForMatrixEvent, Membership, Mention } from '../../types/zion-types'
import {
    ClientEvent,
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
} from 'matrix-js-sdk'
import { enrichPowerLevels } from '../../client/matrix/PowerLevels'
import {
    BlockchainTransactionEvent,
    MessageReactions,
    RoomMessageEvent,
    ThreadStats,
    TimelineEvent,
    TimelineEvent_OneOf,
    ZTEvent,
} from '../../types/timeline-types'
import { staticAssertNever } from '../../utils/zion-utils'
import {
    ReactionsMap,
    ThreadsMap,
    ThreadStatsMap,
    TimelinesMap,
    useTimelineStore,
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
        // timeline helpers
        const removeEvent = (roomId: string, eventId: string) => {
            setState((state) => {
                const eventIndex = state.timelines[roomId]?.findIndex((e) => e.eventId == eventId)
                if ((eventIndex ?? -1) < 0) {
                    return state
                }
                const event = state.timelines[roomId][eventIndex]

                return {
                    timelines: removeTimelineEvent(roomId, eventIndex, state.timelines),
                    threadsStats: removeThreadStat(roomId, event, state.threadsStats),
                    threads: removeThreadEvent(roomId, event, state.threads),
                    reactions: removeReaction(roomId, event, state.reactions),
                }
            })
        }
        const appendEvent = (roomId: string, timelineEvent: TimelineEvent) => {
            setState((state) => ({
                timelines: appendTimelineEvent(roomId, timelineEvent, state.timelines),
                threadsStats: addThreadStats(
                    roomId,
                    timelineEvent,
                    state.threadsStats,
                    state.timelines[roomId],
                    userId,
                ),
                threads: appendThreadEvent(roomId, timelineEvent, state.threads),
                reactions: addReactions(roomId, timelineEvent, state.reactions),
            }))
        }
        const prependEvent = (roomId: string, timelineEvent: TimelineEvent) => {
            setState((state) => ({
                timelines: prependTimelineEvent(roomId, timelineEvent, state.timelines),
                threadsStats: addThreadStats(
                    roomId,
                    timelineEvent,
                    state.threadsStats,
                    state.timelines[roomId],
                    userId,
                ),
                threads: prependThreadEvent(roomId, timelineEvent, state.threads),
                reactions: addReactions(roomId, timelineEvent, state.reactions),
            }))
        }

        const replaceEvent = (
            roomId: string,
            replacedMsgId: string,
            timelineEvent: TimelineEvent,
        ) => {
            setState((state) => {
                const timeline = state.timelines[roomId] ?? []
                const eventIndex = timeline.findIndex(
                    (e: TimelineEvent) => e.eventId === replacedMsgId,
                )
                if (eventIndex === -1) {
                    return state
                }
                const oldEvent = timeline[eventIndex]
                const newEvent = toReplacedMessageEvent(oldEvent, timelineEvent)

                const threadParentId = newEvent.threadParentId
                const threadTimeline = threadParentId
                    ? state.threads[roomId]?.[threadParentId]
                    : undefined
                const threadEventIndex =
                    threadTimeline?.findIndex((e) => e.eventId === replacedMsgId) ?? -1

                return {
                    timelines: replaceTimelineEvent(
                        roomId,
                        newEvent,
                        eventIndex,
                        timeline,
                        state.timelines,
                    ),
                    threadsStats: addThreadStats(
                        roomId,
                        newEvent,
                        removeThreadStat(roomId, oldEvent, state.threadsStats),
                        state.timelines[roomId],
                        userId,
                    ),
                    threads:
                        threadParentId && threadTimeline && threadEventIndex >= 0
                            ? {
                                  ...state.threads,
                                  [roomId]: replaceTimelineEvent(
                                      threadParentId,
                                      newEvent,
                                      threadEventIndex,
                                      threadTimeline,
                                      state.threads[roomId],
                                  ),
                              }
                            : threadParentId
                            ? appendThreadEvent(roomId, newEvent, state.threads)
                            : state.threads,
                    reactions: addReactions(
                        roomId,
                        newEvent,
                        removeReaction(roomId, oldEvent, state.reactions),
                    ),
                }
            })
        }
        const initRoomTimeline = (room: MatrixRoom) => {
            const timelineEvents = toTimelineEvents(room, userId)
            const aggregated = toStatsAndReactions(timelineEvents, userId)
            setState((state) => ({
                timelines: { ...state.timelines, [room.roomId]: timelineEvents },
                threadsStats: {
                    ...state.threadsStats,
                    [room.roomId]: aggregated.threadStats,
                },
                threads: {
                    ...state.threads,
                    [room.roomId]: aggregated.threads,
                },
                reactions: {
                    ...state.reactions,
                    [room.roomId]: aggregated.reactions,
                },
            }))
        }

        const initStateData = () => {
            // initial state, for some reason the timeline doesn't filter replacements
            const timelines = client.getRooms().reduce((acc: TimelinesMap, room: MatrixRoom) => {
                acc[room.roomId] = toTimelineEvents(room, userId)
                return acc
            }, {} as TimelinesMap)

            const { threadsStats, threads, reactions } = Object.entries(timelines).reduce(
                (acc, kv) => {
                    const channelId = kv[0]
                    const aggregated = toStatsAndReactions(kv[1], userId)
                    acc.threadsStats[channelId] = aggregated.threadStats
                    acc.threads[channelId] = aggregated.threads
                    acc.reactions[channelId] = aggregated.reactions
                    return acc
                },
                {
                    threadsStats: {} as ThreadStatsMap,
                    threads: {} as ThreadsMap,
                    reactions: {} as ReactionsMap,
                },
            )

            setState(() => ({
                timelines,
                threadsStats,
                threads,
                reactions,
            }))
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
            const timelineEvent = toEvent(event, userId)
            const replacedMsgId = getReplacedMessageId(event)
            if (removed) {
                removeEvent(roomId, timelineEvent.eventId)
            } else if (replacedMsgId !== undefined) {
                replaceEvent(roomId, replacedMsgId, timelineEvent)
            } else if (toStartOfTimeline) {
                prependEvent(roomId, timelineEvent)
            } else {
                appendEvent(roomId, timelineEvent)
            }
            // handle local id replacement
            if (timelineEvent.isLocalPending) {
                event.once(MatrixEventEvent.LocalEventIdReplaced, () => {
                    replaceEvent(roomId, timelineEvent.eventId, toEvent(event, userId))
                })
            }
        }

        const onEventDecrypted = (event: MatrixEvent) => {
            const eventId = event.getId()
            const roomId = event.getRoomId()
            if (!eventId || !roomId) {
                return
            }
            replaceEvent(roomId, eventId, toEvent(event, userId))
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
            replaceEvent(roomId, replacingId, toEvent(event, userId))
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
            setState(() => ({
                timelines: {},
                threadsStats: {},
                threads: {},
                reactions: {},
            }))
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
    const fbc = `${event.getType()} ${getFallbackContent(
        event,
        sender.displayName,
        content,
        error,
    )}`
    // console.log("!!!! to event", event.getId(), fbc);
    return {
        eventId: eventId,
        originServerTs: event.getTs(),
        updatedServerTs: event.replacingEvent()?.getTs(),
        content: content,
        fallbackContent: fbc,
        isLocalPending: eventId.startsWith('~'),
        threadParentId: getThreadParentId(content),
        reactionParentId: getReactionParentId(content),
        isMentioned: getIsMentioned(content, userId),
        sender,
    }
}

function toReplacedMessageEvent(prev: TimelineEvent, next: TimelineEvent): TimelineEvent {
    if (
        next.content?.kind !== ZTEvent.RoomMessage ||
        prev.content?.kind !== ZTEvent.RoomMessage ||
        !next.content
    ) {
        return next
    }
    // when we replace an event, we copy the content up to the root event
    // so we keep the prev id, but use the next content
    const eventId = prev.eventId.startsWith('$') ? prev.eventId : next.eventId
    return {
        eventId: eventId,
        originServerTs: prev.originServerTs,
        updatedServerTs: next.originServerTs,
        content: {
            ...next.content,
            inReplyTo: prev.content.inReplyTo,
        },
        fallbackContent: next.fallbackContent,
        isLocalPending: eventId.startsWith('~'),
        threadParentId: prev.threadParentId,
        reactionParentId: prev.reactionParentId,
        isMentioned: next.isMentioned,
        sender: prev.sender,
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
    const content = event.getContent()
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
                    inReplyTo: event.replyEventId,
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
            return {
                content: {
                    kind: ZTEvent.RoomRedaction,
                    inReplyTo: event.replyEventId,
                    content: content,
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

        case ZTEvent.BlockchainTransaction: {
            const hash = event.getStateKey()
            if (!hash) {
                return {
                    error: `${describe()} has no state key`,
                }
            }

            return {
                content: {
                    kind: ZTEvent.BlockchainTransaction,
                    content: content as BlockchainTransactionEvent['content'],
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

function getFallbackContent(
    event: MatrixEvent,
    senderDisplayName: string,
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
            return `${senderDisplayName} reacted with ${content.reaction} to ${content.targetEventId}`
        case ZTEvent.RoomAvatar:
            return `url: ${content.url ?? 'undefined'}`
        case ZTEvent.RoomCanonicalAlias: {
            const alt = (content.altAliases ?? []).join(', ')
            return `alias: ${content.alias}, alt alaises: ${alt}`
        }
        case ZTEvent.RoomCreate:
            return content.type ? `type: ${content.type}` : ''
        case ZTEvent.RoomEncryption:
            return `algorithm: ${content.roomEncryption.algorithm} rotationMs: ${
                content.roomEncryption.rotationPeriodMs?.toString() ?? 'N/A'
            } rotationMsgs: ${content.roomEncryption.rotationPeriodMsgs?.toString() ?? 'N/A'}`
        case ZTEvent.RoomMessageEncrypted:
            return `Decrypting...`
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
            return `${senderDisplayName}: ${content.body}`
        case ZTEvent.RoomName:
            return `newValue: ${content.name}`
        case ZTEvent.RoomTopic:
            return `newValue: ${content.topic}`
        case ZTEvent.RoomRedaction:
            return `${senderDisplayName}: ~Redacted~`
        case ZTEvent.RoomPowerLevels:
            return `${eventType}`
        case ZTEvent.SpaceChild:
            return `childId: ${content.childId}`
        case ZTEvent.SpaceParent:
            return `parentId: ${content.parentId}`
        case ZTEvent.BlockchainTransaction:
            return `blockchainTransaction: ${content.content.hash}`
        default:
            staticAssertNever(content)
            return `Unreachable ${eventType}`
    }
}

function toTimelineEvents(room: MatrixRoom, userId: string) {
    return (
        room
            .getLiveTimeline()
            .getEvents()
            ?.filter((m) => isZTimelineEvent(m)) ?? []
    ).map((x) => toEvent(x, userId))
}

function toStatsAndReactions(timeline: TimelineEvent[], userId: string) {
    return timeline.reduce<{
        threadStats: Record<string, ThreadStats>
        threads: Record<string, TimelineEvent[]>
        reactions: Record<string, MessageReactions>
    }>(
        (acc, m) => {
            if (m.threadParentId) {
                acc.threadStats[m.threadParentId] = addThreadStat(
                    m,
                    m.threadParentId,
                    acc.threadStats[m.threadParentId],
                    timeline,
                    userId,
                )
                const thread = acc.threads[m.threadParentId] ?? []
                thread.push(m)
                acc.threads[m.threadParentId] = thread
            }
            if (m.reactionParentId) {
                acc.reactions[m.reactionParentId] = addReaction(
                    m,
                    acc.reactions[m.reactionParentId],
                )
            }
            return acc
        },
        {
            threadStats: {} as Record<string, ThreadStats>,
            threads: {} as Record<string, TimelineEvent[]>,
            reactions: {} as Record<string, MessageReactions>,
        },
    )
}

function addThreadStats(
    roomId: string,
    timelineEvent: TimelineEvent,
    threadsStats: ThreadStatsMap,
    timeline: TimelineEvent[] | undefined,
    userId: string,
): ThreadStatsMap {
    const parentId = timelineEvent.threadParentId
    // if we have a parent...
    if (parentId) {
        return {
            ...threadsStats,
            [roomId]: {
                ...threadsStats[roomId],
                [parentId]: addThreadStat(
                    timelineEvent,
                    parentId,
                    threadsStats[roomId]?.[parentId],
                    timeline,
                    userId,
                ),
            },
        }
    }
    // if we are a parent...
    if (threadsStats[roomId]?.[timelineEvent.eventId]) {
        // update ourself in the map
        return {
            ...threadsStats,
            [roomId]: {
                ...threadsStats[roomId],
                [timelineEvent.eventId]: {
                    ...threadsStats[roomId][timelineEvent.eventId],
                    parentEvent: timelineEvent,
                    parentMessageContent: getRoomMessageContent(timelineEvent),
                },
            },
        }
    }
    // otherwise noop
    return threadsStats
}

function makeNewThreadStats(
    event: TimelineEvent,
    parentId: string,
    timeline?: TimelineEvent[],
): ThreadStats {
    const parent = timeline?.find((t) => t.eventId === parentId) // one time lookup of the parent message for the first reply
    return {
        replyCount: 0,
        userIds: new Set<string>(),
        latestTs: event.originServerTs,
        parentId,
        parentEvent: parent,
        parentMessageContent: getRoomMessageContent(parent),
        isParticipating: false,
    }
}

function addThreadStat(
    event: TimelineEvent,
    parentId: string,
    entry: ThreadStats | undefined,
    timeline: TimelineEvent[] | undefined,
    userId: string,
): ThreadStats {
    const updated = entry ? { ...entry } : makeNewThreadStats(event, parentId, timeline)
    updated.replyCount++
    updated.latestTs = Math.max(updated.latestTs, event.originServerTs)
    const senderId = getMessageSenderId(event)
    if (senderId) {
        updated.userIds.add(senderId)
    }
    updated.isParticipating =
        updated.isParticipating ||
        updated.userIds.has(userId) ||
        updated.parentEvent?.sender.id === userId ||
        event.isMentioned
    return updated
}

function removeThreadStat(
    roomId: string,
    timelineEvent: TimelineEvent,
    threadsStats: ThreadStatsMap,
) {
    const parentId = timelineEvent.threadParentId
    if (!parentId) {
        return threadsStats
    }
    if (!threadsStats[roomId]?.[parentId]) {
        return threadsStats
    }
    const updated = { ...threadsStats[roomId] }
    const entry = updated[parentId]
    if (entry) {
        entry.replyCount--
        if (entry.replyCount === 0) {
            delete updated[parentId]
        } else {
            const senderId = getMessageSenderId(timelineEvent)
            if (senderId) {
                entry.userIds.delete(senderId)
            }
        }
    }
    return { ...threadsStats, [roomId]: updated }
}

// todo, this should be addReactions, addReaction takes a single reaction

function addReactions(roomId: string, event: TimelineEvent, reactions: ReactionsMap): ReactionsMap {
    const parentId = event.reactionParentId
    if (!parentId) {
        return reactions
    }
    return {
        ...reactions,
        [roomId]: {
            ...reactions[roomId],
            [parentId]: addReaction(event, reactions[roomId]?.[parentId]),
        },
    }
}

function addReaction(event: TimelineEvent, entry?: MessageReactions): MessageReactions {
    const content = event.content?.kind === ZTEvent.Reaction ? event.content : undefined
    if (!content) {
        return entry ?? {}
    }
    const reactionName = content.reaction
    const senderId = event.sender.id
    return {
        ...entry,
        [reactionName]: {
            ...entry?.[reactionName],
            [senderId]: { eventId: event.eventId },
        },
    }
}

function removeReaction(
    roomId: string,
    event: TimelineEvent,
    reactions: ReactionsMap,
): ReactionsMap {
    const parentId = event.reactionParentId
    if (!parentId) {
        return reactions
    }
    if (!reactions[roomId]?.[parentId]) {
        return reactions
    }
    const content = event.content?.kind === ZTEvent.Reaction ? event.content : undefined
    if (!content) {
        return reactions
    }
    const reactionName = content.reaction
    const senderId = event.sender.id
    const updated = { ...reactions[roomId] }
    const entry = updated[parentId]
    if (entry) {
        const reactions = entry[reactionName]
        if (reactions) {
            delete reactions[senderId]
        }
        if (Object.keys(reactions).length === 0) {
            delete entry[reactionName]
        }
    }
    return { ...reactions, [roomId]: updated }
}

function removeThreadEvent(roomId: string, event: TimelineEvent, threads: ThreadsMap): ThreadsMap {
    const parentId = event.threadParentId
    if (!parentId) {
        return threads
    }
    const threadEventIndex =
        threads[roomId]?.[parentId]?.findIndex((e) => e.eventId === event.eventId) ?? -1
    if (threadEventIndex === -1) {
        return threads
    }
    return {
        ...threads,
        [roomId]: removeTimelineEvent(parentId, threadEventIndex, threads[roomId]),
    }
}

function appendThreadEvent(
    roomId: string,
    timelineEvent: TimelineEvent,
    threads: ThreadsMap,
): ThreadsMap {
    if (!timelineEvent.threadParentId) {
        return threads
    }
    const newf = {
        ...threads,
        [roomId]: appendTimelineEvent(
            timelineEvent.threadParentId,
            timelineEvent,
            threads[roomId] ?? {},
        ),
    }

    return newf
}

function prependThreadEvent(
    roomId: string,
    timelineEvent: TimelineEvent,
    threads: ThreadsMap,
): ThreadsMap {
    if (!timelineEvent.threadParentId) {
        return threads
    }
    return {
        ...threads,
        [roomId]: prependTimelineEvent(
            timelineEvent.threadParentId,
            timelineEvent,
            threads[roomId] ?? {},
        ),
    }
}

function removeTimelineEvent(
    roomId: string,
    eventIndex: number,
    timelines: TimelinesMap,
): TimelinesMap {
    return {
        ...timelines,
        [roomId]: [
            ...timelines[roomId].slice(0, eventIndex),
            ...timelines[roomId].slice(eventIndex + 1),
        ],
    }
}

function appendTimelineEvent(
    roomId: string,
    timelineEvent: TimelineEvent,
    timelines: TimelinesMap,
) {
    return {
        ...timelines,
        [roomId]: [...(timelines[roomId] ?? []), timelineEvent],
    }
}

function prependTimelineEvent(
    roomId: string,
    timelineEvent: TimelineEvent,
    timelines: TimelinesMap,
) {
    return {
        ...timelines,
        [roomId]: [timelineEvent, ...(timelines[roomId] ?? [])],
    }
}

function replaceTimelineEvent(
    roomId: string,
    newEvent: TimelineEvent,
    eventIndex: number,
    timeline: TimelineEvent[],
    timelines: TimelinesMap,
) {
    return {
        ...timelines,
        [roomId]: [...timeline.slice(0, eventIndex), newEvent, ...timeline.slice(eventIndex + 1)],
    }
}

function getRoomMessageContent(event?: TimelineEvent): RoomMessageEvent | undefined {
    return event?.content?.kind === ZTEvent.RoomMessage ? event.content : undefined
}

function getMessageSenderId(event: TimelineEvent): string | undefined {
    if (!getRoomMessageContent(event)) {
        return undefined
    }
    return event.sender.id
}

function getThreadParentId(content: TimelineEvent_OneOf | undefined): string | undefined {
    return content?.kind === ZTEvent.RoomMessage ? content.inReplyTo : undefined
}

function getReactionParentId(content: TimelineEvent_OneOf | undefined): string | undefined {
    return content?.kind === ZTEvent.Reaction ? content.targetEventId : undefined
}

function getIsMentioned(content: TimelineEvent_OneOf | undefined, userId: string): boolean {
    return content?.kind === ZTEvent.RoomMessage
        ? content.mentions.findIndex((x) => x.userId === userId) >= 0
        : false
}

export function isZTimelineEvent(event: MatrixEvent): boolean {
    return !event.isRelation(RelationType.Replace)
}
