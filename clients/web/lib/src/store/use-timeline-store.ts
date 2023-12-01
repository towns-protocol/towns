import { create } from 'zustand'
import {
    MessageReactions,
    RedactedEvent,
    RoomMessageEvent,
    ThreadStats,
    TimelineEvent,
    TimelineEvent_OneOf,
    ZTEvent,
    getFallbackContent,
} from '../types/timeline-types'
import reverse from 'lodash/reverse'

/// TimelinesMap: { roomId: TimelineEvent[] }
export type TimelinesMap = Record<string, TimelineEvent[]>
/// ThreadStatsMap: { roomId: { eventId: ThreadStats } }
export type ThreadStatsMap = Record<string, Record<string, ThreadStats>>
/// ThreadContentMap: { roomId: { eventId: ThreadContent } }
export type ThreadsMap = Record<string, TimelinesMap>
/// ReactionsMap: { roomId: { eventId: MessageReactions } }
export type ReactionsMap = Record<string, Record<string, MessageReactions>>

export type TimelineStoreStates = {
    timelines: TimelinesMap
    replacedEvents: Record<string, { oldEvent: TimelineEvent; newEvent: TimelineEvent }[]>
    pendingReplacedEvents: Record<string, Record<string, TimelineEvent>>
    threadsStats: ThreadStatsMap
    threads: ThreadsMap
    reactions: ReactionsMap
}

export interface TimelineStoreInterface {
    initializeStream: (userId: string, streamId: string) => void
    reset: (roomIds: string[]) => void
    appendEvents: (events: TimelineEvent[], userId: string, streamId: string) => void
    prependEvents: (events: TimelineEvent[], userId: string, streamId: string) => void
    updateEvents: (events: TimelineEvent[], userId: string, streamId: string) => void
    updateEvent: (
        event: TimelineEvent,
        userId: string,
        streamId: string,
        updatingEventId: string,
    ) => void
}

export type TimelineStore = TimelineStoreStates & {
    setState: TimelineStoreInterface
}

export const useTimelineStore = create<TimelineStore>((set) => ({
    timelines: {},
    replacedEvents: {},
    pendingReplacedEvents: {},
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
    const initializeStream = (userId: string, roomId: string) => {
        const aggregated = toStatsAndReactions([], userId)
        setState((state) => ({
            timelines: { ...state.timelines, [roomId]: [] },
            replacedEvents: state.replacedEvents,
            pendingReplacedEvents: state.pendingReplacedEvents,
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
                delete prev.replacedEvents[roomId]
                delete prev.pendingReplacedEvents[roomId]
                delete prev.threadsStats[roomId]
                delete prev.threads[roomId]
                delete prev.reactions[roomId]
            }
            return prev
        })
    }
    const removeEvent = (state: TimelineStoreStates, roomId: string, eventId: string) => {
        const eventIndex = state.timelines[roomId]?.findIndex((e) => e.eventId == eventId)
        if ((eventIndex ?? -1) < 0) {
            return state
        }
        const event = state.timelines[roomId][eventIndex]
        return {
            timelines: removeTimelineEvent(roomId, eventIndex, state.timelines),
            replacedEvents: state.replacedEvents,
            pendingReplacedEvents: state.pendingReplacedEvents,
            threadsStats: removeThreadStat(roomId, event, state.threadsStats),
            threads: removeThreadEvent(roomId, event, state.threads),
            reactions: removeReaction(roomId, event, state.reactions),
        }
    }
    const appendEvent = (
        state: TimelineStoreStates,
        userId: string,
        roomId: string,
        timelineEvent: TimelineEvent,
    ) => {
        return {
            timelines: appendTimelineEvent(roomId, timelineEvent, state.timelines),
            replacedEvents: state.replacedEvents,
            pendingReplacedEvents: state.pendingReplacedEvents,
            threadsStats: addThreadStats(
                roomId,
                timelineEvent,
                state.threadsStats,
                state.timelines[roomId],
                userId,
            ),
            threads: insertThreadEvent(roomId, timelineEvent, state.threads),
            reactions: addReactions(roomId, timelineEvent, state.reactions),
        }
    }
    const prependEvent = (
        state: TimelineStoreStates,
        userId: string,
        roomId: string,
        inTimelineEvent: TimelineEvent,
    ) => {
        const timelineEvent = state.pendingReplacedEvents[roomId]?.[inTimelineEvent.eventId]
            ? toReplacedMessageEvent(
                  inTimelineEvent,
                  state.pendingReplacedEvents[roomId][inTimelineEvent.eventId],
              )
            : inTimelineEvent
        return {
            timelines: prependTimelineEvent(roomId, timelineEvent, state.timelines),
            replacedEvents: state.replacedEvents,
            pendingReplacedEvents: state.pendingReplacedEvents,
            threadsStats: addThreadStats(
                roomId,
                timelineEvent,
                state.threadsStats,
                state.timelines[roomId],
                userId,
            ),
            threads: insertThreadEvent(roomId, timelineEvent, state.threads),
            reactions: addReactions(roomId, timelineEvent, state.reactions),
        }
    }

    const replaceEvent = (
        state: TimelineStoreStates,
        userId: string,
        roomId: string,
        replacedMsgId: string,
        timelineEvent: TimelineEvent,
    ) => {
        const timeline = state.timelines[roomId] ?? []
        const eventIndex = timeline.findIndex((e: TimelineEvent) => e.eventId === replacedMsgId)
        if (eventIndex === -1) {
            // if we didn't find an event to replace...
            if (state.pendingReplacedEvents[roomId]?.[replacedMsgId]) {
                // if we already have a replacement here, leave it, because we sync backwards, we assume the first one is the correct one
                return state
            } else {
                // otherwise add it to the pending list
                return {
                    ...state,
                    pendingReplacedEvents: {
                        ...state.pendingReplacedEvents,
                        [roomId]: {
                            ...state.pendingReplacedEvents[roomId],
                            [replacedMsgId]: timelineEvent,
                        },
                    },
                }
            }
        }
        const oldEvent = timeline[eventIndex]
        const newEvent = toReplacedMessageEvent(oldEvent, timelineEvent)

        const threadParentId = newEvent.threadParentId
        const threadTimeline = threadParentId ? state.threads[roomId]?.[threadParentId] : undefined
        const threadEventIndex = threadTimeline?.findIndex((e) => e.eventId === replacedMsgId) ?? -1

        return {
            timelines: replaceTimelineEvent(
                roomId,
                newEvent,
                eventIndex,
                timeline,
                state.timelines,
            ),
            replacedEvents: {
                ...state.replacedEvents,
                [roomId]: [...(state.replacedEvents[roomId] ?? []), { oldEvent, newEvent }],
            },
            pendingReplacedEvents: state.pendingReplacedEvents,
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
                    ? insertThreadEvent(roomId, newEvent, state.threads)
                    : state.threads,
            reactions: addReactions(
                roomId,
                newEvent,
                removeReaction(roomId, oldEvent, state.reactions),
            ),
        }
    }

    function processEvent(
        state: TimelineStoreStates,
        event: TimelineEvent,
        userId: string,
        streamId: string,
        updatingEventId?: string,
    ) {
        const editsEventId = getEditsId(event.content)
        const redactsEventId = getRedactsId(event.content)
        if (redactsEventId) {
            if (updatingEventId) {
                // remove the formerly encrypted event
                state = removeEvent(state, streamId, updatingEventId)
            }
            const redactedEvent = makeRedactionEvent(event)
            state = replaceEvent(state, userId, streamId, redactsEventId, redactedEvent)
            state = appendEvent(state, userId, streamId, event)
        } else if (editsEventId) {
            if (updatingEventId) {
                state = removeEvent(state, streamId, updatingEventId)
            }
            state = replaceEvent(state, userId, streamId, editsEventId, event)
        } else {
            if (updatingEventId) {
                // replace the formerly encrypted event
                state = replaceEvent(state, userId, streamId, updatingEventId, event)
            } else {
                state = appendEvent(state, userId, streamId, event)
            }
        }
        return state
    }

    function appendEvents(events: TimelineEvent[], userId: string, streamId: string) {
        setState((state) => {
            for (const event of events) {
                state = processEvent(state, event, userId, streamId, undefined)
            }
            return state
        })
    }

    function prependEvents(events: TimelineEvent[], userId: string, streamId: string) {
        setState((state) => {
            for (const event of reverse(events)) {
                const editsEventId = getEditsId(event.content)
                const redactsEventId = getRedactsId(event.content)
                if (redactsEventId) {
                    const redactedEvent = makeRedactionEvent(event)
                    state = prependEvent(state, userId, streamId, event)
                    state = replaceEvent(state, userId, streamId, redactsEventId, redactedEvent)
                } else if (editsEventId) {
                    state = replaceEvent(state, userId, streamId, editsEventId, event)
                } else {
                    state = prependEvent(state, userId, streamId, event)
                }
            }
            return state
        })
    }

    function updateEvents(events: TimelineEvent[], userId: string, streamId: string) {
        setState((state) => {
            for (const event of events) {
                state = processEvent(state, event, userId, streamId, event.eventId)
            }
            return state
        })
    }

    function updateEvent(
        event: TimelineEvent,
        userId: string,
        streamId: string,
        replacingEventId: string,
    ) {
        setState((state) => {
            return processEvent(state, event, userId, streamId, replacingEventId)
        })
    }

    return {
        initializeStream,
        reset,
        appendEvents,
        prependEvents,
        updateEvents,
        updateEvent,
    }
}

function toReplacedMessageEvent(prev: TimelineEvent, next: TimelineEvent): TimelineEvent {
    if (next.content?.kind === ZTEvent.RoomMessage && prev.content?.kind === ZTEvent.RoomMessage) {
        // when we replace an event, we copy the content up to the root event
        // so we keep the prev id, but use the next content
        const isLocalId = prev.eventId.startsWith('~')
        const eventId = !isLocalId ? prev.eventId : next.eventId

        return {
            ...next,
            eventId: eventId,
            eventNum: prev.eventNum,
            confirmedEventNum: prev.confirmedEventNum ?? next.confirmedEventNum,
            confirmedInBlockNum: prev.confirmedInBlockNum ?? next.confirmedInBlockNum,
            createdAtEpocMs: prev.createdAtEpocMs,
            updatedAtEpocMs: next.createdAtEpocMs,
            content: {
                ...next.content,
                inReplyTo: prev.content.inReplyTo,
            },
            threadParentId: prev.threadParentId,
            reactionParentId: prev.reactionParentId,
            sender: prev.sender,
        }
    } else if (next.content?.kind === ZTEvent.RedactedEvent) {
        // for redacted events, carry over previous pointers to content
        // we don't want to lose thread info
        return {
            ...next,
            eventId: prev.eventId,
            eventNum: prev.eventNum,
            confirmedEventNum: prev.confirmedEventNum ?? next.confirmedEventNum,
            confirmedInBlockNum: prev.confirmedInBlockNum ?? next.confirmedInBlockNum,
            createdAtEpocMs: prev.createdAtEpocMs,
            updatedAtEpocMs: next.createdAtEpocMs,
            threadParentId: prev.threadParentId,
            reactionParentId: prev.reactionParentId,
        }
    } else if (prev.content?.kind === ZTEvent.RedactedEvent) {
        // replacing a redacted event should maintain the redacted state
        return {
            ...prev,
            confirmedEventNum: prev.confirmedEventNum ?? next.confirmedEventNum,
            confirmedInBlockNum: prev.confirmedInBlockNum ?? next.confirmedInBlockNum,
        }
    } else {
        // make sure we carry the createdAtEpocMs of the previous event
        // so we don't end up with a timeline that has events out of order.
        return {
            ...next,
            eventId: prev.eventId,
            eventNum: prev.eventNum,
            confirmedEventNum: prev.confirmedEventNum ?? next.confirmedEventNum,
            confirmedInBlockNum: prev.confirmedInBlockNum ?? next.confirmedInBlockNum,
            createdAtEpocMs: prev.createdAtEpocMs,
            updatedAtEpocMs: next.createdAtEpocMs,
        }
    }
}

function makeRedactionEvent(redactionAction: TimelineEvent): TimelineEvent {
    if (redactionAction.content?.kind !== ZTEvent.RedactionActionEvent) {
        throw new Error('makeRedactionEvent called with non-redaction action event')
    }
    const newContent = {
        kind: ZTEvent.RedactedEvent,
    } satisfies RedactedEvent

    return {
        ...redactionAction,
        content: newContent,
        fallbackContent: getFallbackContent('', newContent),
        isRedacted: true,
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
                    isParticipating:
                        threadsStats[roomId][timelineEvent.eventId].isParticipating ||
                        (timelineEvent.content?.kind !== ZTEvent.RedactedEvent &&
                            threadsStats[roomId][timelineEvent.eventId].replyCount > 0 &&
                            (timelineEvent.sender.id === userId || timelineEvent.isMentioned)),
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
        latestTs: event.createdAtEpocMs,
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
    if (event.content?.kind === ZTEvent.RedactedEvent) {
        return updated
    }
    updated.replyCount++
    updated.latestTs = Math.max(updated.latestTs, event.createdAtEpocMs)
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

function insertThreadEvent(
    roomId: string,
    timelineEvent: TimelineEvent,
    threads: ThreadsMap,
): ThreadsMap {
    if (!timelineEvent.threadParentId) {
        return threads
    }
    return {
        ...threads,
        [roomId]: insertTimelineEvent(
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

function insertTimelineEvent(
    roomId: string,
    timelineEvent: TimelineEvent,
    timelines: TimelinesMap,
) {
    // thread items are decrypted in an unpredictable order, so we need to insert them in the correct order
    return {
        ...timelines,
        [roomId]: [timelineEvent, ...(timelines[roomId] ?? [])].sort((a, b) =>
            a.eventNum > b.eventNum ? 1 : -1,
        ),
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

export function getEditsId(content: TimelineEvent_OneOf | undefined): string | undefined {
    return content?.kind === ZTEvent.RoomMessage ? content.editsEventId : undefined
}

export function getRedactsId(content: TimelineEvent_OneOf | undefined): string | undefined {
    return content?.kind === ZTEvent.RedactionActionEvent ? content.refEventId : undefined
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
