import { create } from 'zustand'
import {
    MessageReactions,
    RoomMessageEvent,
    ThreadStats,
    TimelineEvent,
    TimelineEvent_OneOf,
    ZTEvent,
} from '../types/timeline-types'
import reverse from 'lodash/reverse'

/// TimelinesMap: { roomId: TimelineEvent[] }
export type TimelinesMap = Record<string, TimelineEvent[]>
/// ThreadStatsMap: { roomId: { eventId: ThreadStats } }
export type ThreadStatsMap = Record<string, Record<string, ThreadStats>>
/// ThreadContentMap: { roomId: { eventId: ThreadContent } }
export type ThreadsMap = Record<string, Record<string, TimelineEvent[]>>
/// ReactionsMap: { roomId: { eventId: MessageReactions } }
export type ReactionsMap = Record<string, Record<string, MessageReactions>>

export type TimelineStoreStates = {
    timelines: TimelinesMap
    deletedEvents: Record<string, TimelineEvent[]>
    replacedEvents: Record<string, { oldEvent: TimelineEvent; newEvent: TimelineEvent }[]>
    threadsStats: ThreadStatsMap
    threads: ThreadsMap
    reactions: ReactionsMap
}

export interface TimelineStoreInterface {
    initialize: (userId: string, timelines: TimelinesMap) => void
    initializeRoom: (userId: string, roomId: string, timelineEvents: TimelineEvent[]) => void
    reset: (roomIds: string[]) => void
    removeEvent: (roomId: string, eventId: string) => void
    appendEvent: (userId: string, roomId: string, timelineEvent: TimelineEvent) => void
    prependEvent: (userId: string, roomId: string, timelineEvent: TimelineEvent) => void
    replaceEvent: (
        userId: string,
        roomId: string,
        replacedMsgId: string,
        timelineEvent: TimelineEvent,
    ) => void
    processEvent: (
        event: TimelineEvent,
        userId: string,
        streamId: string,
        decryptedFromEventId?: string,
    ) => void
    processEvents: (events: TimelineEvent[], userId: string, streamId: string) => void
    prependEvents: (events: TimelineEvent[], userId: string, streamId: string) => void
}

export type TimelineStore = TimelineStoreStates & {
    setState: TimelineStoreInterface
}

export const useTimelineStore = create<TimelineStore>((set) => ({
    timelines: {},
    deletedEvents: {},
    replacedEvents: {},
    threadsStats: {},
    threads: {},
    reactions: {},
    setState: makeTimelineStoreInterface(
        (fn: (prevState: TimelineStoreStates) => TimelineStoreStates) => {
            set((state) => fn(state))
        },
    ),
}))

function makeTimelineStoreInterface(
    setState: (fn: (prevState: TimelineStoreStates) => TimelineStoreStates) => void,
): TimelineStoreInterface {
    const initialize = (userId: string, timelines: TimelinesMap) => {
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
        setState((prev) => ({
            timelines: { ...prev.timelines, ...timelines },
            deletedEvents: prev.deletedEvents,
            replacedEvents: prev.replacedEvents,
            threadsStats: { ...prev.threadsStats, ...threadsStats },
            threads: { ...prev.threads, ...threads },
            reactions: { ...prev.reactions, ...reactions },
        }))
    }
    const initializeRoom = (userId: string, roomId: string, timelineEvents: TimelineEvent[]) => {
        const aggregated = toStatsAndReactions(timelineEvents, userId)
        setState((state) => ({
            timelines: { ...state.timelines, [roomId]: timelineEvents },
            deletedEvents: state.deletedEvents,
            replacedEvents: state.replacedEvents,
            threadsStats: {
                ...state.threadsStats,
                [roomId]: aggregated.threadStats,
            },
            threads: {
                ...state.threads,
                [roomId]: aggregated.threads,
            },
            reactions: {
                ...state.reactions,
                [roomId]: aggregated.reactions,
            },
        }))
    }

    const reset = (roomIds: string[]) => {
        setState((prev) => {
            for (const roomId of roomIds) {
                delete prev.timelines[roomId]
                delete prev.deletedEvents[roomId]
                delete prev.replacedEvents[roomId]
                delete prev.threadsStats[roomId]
                delete prev.threads[roomId]
                delete prev.reactions[roomId]
            }
            return prev
        })
    }
    const removeEvent = (roomId: string, eventId: string) => {
        setState((state) => {
            const eventIndex = state.timelines[roomId]?.findIndex((e) => e.eventId == eventId)
            if ((eventIndex ?? -1) < 0) {
                return state
            }
            const event = state.timelines[roomId][eventIndex]

            return {
                timelines: removeTimelineEvent(roomId, eventIndex, state.timelines),
                deletedEvents: appendTimelineEvent(roomId, event, state.deletedEvents),
                replacedEvents: state.replacedEvents,
                threadsStats: removeThreadStat(roomId, event, state.threadsStats),
                threads: removeThreadEvent(roomId, event, state.threads),
                reactions: removeReaction(roomId, event, state.reactions),
            }
        })
    }
    const appendEvent = (userId: string, roomId: string, timelineEvent: TimelineEvent) => {
        setState((state) => ({
            timelines: appendTimelineEvent(roomId, timelineEvent, state.timelines),
            deletedEvents: state.deletedEvents,
            replacedEvents: state.replacedEvents,
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
    const prependEvent = (userId: string, roomId: string, timelineEvent: TimelineEvent) => {
        setState((state) => ({
            timelines: prependTimelineEvent(roomId, timelineEvent, state.timelines),
            deletedEvents: state.deletedEvents,
            replacedEvents: state.replacedEvents,
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
        userId: string,
        roomId: string,
        replacedMsgId: string,
        timelineEvent: TimelineEvent,
    ) => {
        setState((state) => {
            const timeline = state.timelines[roomId] ?? []
            const eventIndex = timeline.findIndex((e: TimelineEvent) => e.eventId === replacedMsgId)
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
                deletedEvents: state.deletedEvents,
                replacedEvents: {
                    ...state.replacedEvents,
                    [roomId]: [...(state.replacedEvents[roomId] ?? []), { oldEvent, newEvent }],
                },
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

    function processEvent(
        event: TimelineEvent,
        userId: string,
        streamId: string,
        decryptedFromEventId?: string,
    ) {
        const replacedEventId = getReplacedId(event.content)
        const redactsEventId = getRedactsId(event.content)
        if (redactsEventId) {
            if (decryptedFromEventId) {
                // remove the formerly encrypted event
                removeEvent(streamId, decryptedFromEventId)
            }
            removeEvent(streamId, redactsEventId)
            appendEvent(userId, streamId, event)
        } else if (replacedEventId) {
            if (decryptedFromEventId) {
                removeEvent(streamId, decryptedFromEventId)
            }
            replaceEvent(userId, streamId, replacedEventId, event)
        } else {
            if (decryptedFromEventId) {
                // replace the formerly encrypted event
                replaceEvent(userId, streamId, decryptedFromEventId, event)
            } else {
                appendEvent(userId, streamId, event)
            }
        }
    }

    function processEvents(events: TimelineEvent[], userId: string, streamId: string) {
        for (const event of events) {
            processEvent(event, userId, streamId, undefined)
        }
    }

    function prependEvents(events: TimelineEvent[], userId: string, streamId: string) {
        // todo, we need to handle replace and redact events here https://linear.app/hnt-labs/issue/HNT-2219/handle-replacements-and-redactions-in-a-paginated-world
        for (const event of reverse(events)) {
            prependEvent(userId, streamId, event)
        }
    }

    return {
        initialize,
        initializeRoom,
        reset,
        removeEvent,
        appendEvent,
        prependEvent,
        replaceEvent,
        processEvent,
        processEvents,
        prependEvents,
    }
}

function toReplacedMessageEvent(prev: TimelineEvent, next: TimelineEvent): TimelineEvent {
    if (next.content?.kind !== ZTEvent.RoomMessage || prev.content?.kind !== ZTEvent.RoomMessage) {
        // When returning early, make sure we carry the originServerTs of the previous event
        // so we don't end up with a timeline that has events out of order.
        return { ...next, originServerTs: prev.originServerTs }
    }
    // when we replace an event, we copy the content up to the root event
    // so we keep the prev id, but use the next content
    const eventId = !prev.isLocalPending ? prev.eventId : next.eventId
    return {
        eventId: eventId,
        status: next.status,
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
        isRedacted: next.isRedacted,
        sender: prev.sender,
    }
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

export function getReplacedId(content: TimelineEvent_OneOf | undefined): string | undefined {
    return content?.kind === ZTEvent.RoomMessage ? content.replacedMsgId : undefined
}

export function getRedactsId(content: TimelineEvent_OneOf | undefined): string | undefined {
    return content?.kind === ZTEvent.RoomRedaction ? content.inReplyTo : undefined
}

export function getThreadParentId(content: TimelineEvent_OneOf | undefined): string | undefined {
    return content?.kind === ZTEvent.RoomMessage ? content.inReplyTo : undefined
}

export function getReactionParentId(content: TimelineEvent_OneOf | undefined): string | undefined {
    return content?.kind === ZTEvent.Reaction ? content.targetEventId : undefined
}

export function getIsMentioned(content: TimelineEvent_OneOf | undefined, userId: string): boolean {
    //TODO: comparison below should be changed as soon as this HNT-1576 will be resolved
    return content?.kind === ZTEvent.RoomMessage
        ? content.mentions.findIndex(
              (x) =>
                  (x.userId ?? '')
                      .toLowerCase()
                      .localeCompare(userId.toLowerCase(), undefined, { sensitivity: 'base' }) == 0,
          ) >= 0
        : false
}
