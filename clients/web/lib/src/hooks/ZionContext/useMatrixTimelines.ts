import { useEffect } from 'react'
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
import {
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

export function useMatrixTimelines(client?: MatrixClient) {
    const setState = useTimelineStore((s) => s.setState)
    useEffect(() => {
        // check preconditions
        if (!client) {
            return
        }
        const userId = client.getUserId()
        if (!userId) {
            throw new Error('userId is expected to be defined and constant')
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
            replacingId: string,
            timelineEvent: TimelineEvent,
        ) => {
            setState((state) => {
                const timeline = state.timelines[roomId] ?? []
                const eventIndex = timeline.findIndex(
                    (e: TimelineEvent) => e.eventId === replacingId,
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
                    threadTimeline?.findIndex((e) => e.eventId === replacingId) ?? -1

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
            const timelineEvents = toTimelineEvents(room)
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
                acc[room.roomId] = toTimelineEvents(room)
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
            eventRoom: MatrixRoom,
            toStartOfTimeline: boolean,
            removed: boolean,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            data: IRoomTimelineData,
        ) => {
            const roomId = eventRoom.roomId
            const timelineEvent = toEvent(event)
            if (removed) {
                removeEvent(roomId, timelineEvent.eventId)
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

export function toEvent(event: MatrixEvent): TimelineEvent {
    const { content, error } = toZionContent(event)
    const fbc = `${event.getType()} ${getFallbackContent(event, content, error)}`
    // console.log("!!!! to event", event.getId(), fbc);
    return {
        eventId: event.getId(),
        eventType: event.getType(),
        originServerTs: event.getTs(),
        updatedServerTs: event.replacingEvent()?.getTs(),
        content: content,
        fallbackContent: fbc,
        isLocalPending: event.getId().startsWith('~'),
        threadParentId: getThreadParentId(content),
        reactionParentId: getReactionParentId(content),
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
        eventType: next.eventType,
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
        case ZTEvent.RoomMessageEncrypted:
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
        case ZTEvent.RoomMessageEncrypted:
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
            return `Unreachable ${eventType}`
    }
}

function toTimelineEvents(room: MatrixRoom) {
    return (
        room
            .getLiveTimeline()
            .getEvents()
            ?.filter((m) => !m.isRelation(RelationType.Replace)) ?? []
    ).map(toEvent)
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
        updated.parentMessageContent?.sender.id === userId
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
    const senderId = content.sender.id
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
    const senderId = content.sender.id
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
    return getRoomMessageContent(event)?.sender.id
}

function getThreadParentId(content: TimelineEvent_OneOf | undefined): string | undefined {
    return content?.kind === ZTEvent.RoomMessage ? content.inReplyTo : undefined
}

function getReactionParentId(content: TimelineEvent_OneOf | undefined): string | undefined {
    return content?.kind === ZTEvent.Reaction ? content.targetEventId : undefined
}
