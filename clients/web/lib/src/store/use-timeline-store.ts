import { createWithEqualityFn } from 'zustand/traditional'
import {
    MessageReactions,
    RedactedEvent,
    RoomMessageEvent,
    ThreadStats,
    TimelineEvent,
    TimelineEventConfirmation,
    TimelineEvent_OneOf,
    ZTEvent,
    getFallbackContent,
} from '../types/timeline-types'
import reverse from 'lodash/reverse'

/// TimelinesMap: { streamId: TimelineEvent[] }
export type TimelinesMap = Record<string, TimelineEvent[]>
/// ThreadStatsMap: { streamId: { eventId: ThreadStats } }
export type ThreadStatsMap = Record<string, Record<string, ThreadStats>>
/// ThreadContentMap: { streamId: { eventId: ThreadContent } }
export type ThreadsMap = Record<string, TimelinesMap>
/// ReactionsMap: { streamId: { eventId: MessageReactions } }
export type ReactionsMap = Record<string, Record<string, MessageReactions>>

export type TimelineStoreStates = {
    timelines: TimelinesMap
    replacedEvents: Record<string, { oldEvent: TimelineEvent; newEvent: TimelineEvent }[]>
    pendingReplacedEvents: Record<string, Record<string, TimelineEvent>>
    threadsStats: ThreadStatsMap
    threads: ThreadsMap
    reactions: ReactionsMap
    lastestEventByUser: { [userId: string]: TimelineEvent }
}

export interface TimelineStoreInterface {
    initializeStream: (userId: string, streamId: string) => void
    reset: (streamIds: string[]) => void
    appendEvents: (events: TimelineEvent[], userId: string, streamId: string) => void
    prependEvents: (events: TimelineEvent[], userId: string, streamId: string) => void
    updateEvents: (events: TimelineEvent[], userId: string, streamId: string) => void
    updateEvent: (
        event: TimelineEvent,
        userId: string,
        streamId: string,
        updatingEventId: string,
    ) => void
    confirmEvents: (confirmations: TimelineEventConfirmation[], streamId: string) => void
}

export type TimelineStore = TimelineStoreStates & {
    setState: TimelineStoreInterface
}

export const useTimelineStore = createWithEqualityFn<TimelineStore>((set) => ({
    timelines: {},
    replacedEvents: {},
    pendingReplacedEvents: {},
    threadsStats: {},
    threads: {},
    reactions: {},
    lastestEventByUser: {},
    setState: makeTimelineStoreInterface(
        (fn: (prevState: TimelineStoreStates) => TimelineStoreStates) => {
            set((state) => fn(state))
        },
    ),
}))

function makeTimelineStoreInterface(
    setState: (fn: (prevState: TimelineStoreStates) => TimelineStoreStates) => void,
): TimelineStoreInterface {
    const initializeStream = (userId: string, streamId: string) => {
        const aggregated = {
            threadStats: {} as Record<string, ThreadStats>,
            threads: {} as Record<string, TimelineEvent[]>,
            reactions: {} as Record<string, MessageReactions>,
        }

        setState((state) => ({
            timelines: { ...state.timelines, [streamId]: [] },
            replacedEvents: state.replacedEvents,
            pendingReplacedEvents: state.pendingReplacedEvents,
            threadsStats: {
                ...state.threadsStats,
                [streamId]: aggregated.threadStats,
            },
            threads: {
                ...state.threads,
                [streamId]: aggregated.threads,
            },
            reactions: {
                ...state.reactions,
                [streamId]: aggregated.reactions,
            },
            lastestEventByUser: state.lastestEventByUser,
        }))
    }

    const reset = (streamIds: string[]) => {
        setState((prev) => {
            for (const streamId of streamIds) {
                delete prev.timelines[streamId]
                delete prev.replacedEvents[streamId]
                delete prev.pendingReplacedEvents[streamId]
                delete prev.threadsStats[streamId]
                delete prev.threads[streamId]
                delete prev.reactions[streamId]
            }
            return prev
        })
    }
    const removeEvent = (state: TimelineStoreStates, streamId: string, eventId: string) => {
        const eventIndex = state.timelines[streamId]?.findIndex((e) => e.eventId == eventId)
        if ((eventIndex ?? -1) < 0) {
            return state
        }
        const event = state.timelines[streamId][eventIndex]
        return {
            timelines: removeTimelineEvent(streamId, eventIndex, state.timelines),
            replacedEvents: state.replacedEvents,
            pendingReplacedEvents: state.pendingReplacedEvents,
            threadsStats: removeThreadStat(streamId, event, state.threadsStats),
            threads: removeThreadEvent(streamId, event, state.threads),
            reactions: removeReaction(streamId, event, state.reactions),
            lastestEventByUser: state.lastestEventByUser,
        }
    }
    const appendEvent = (
        state: TimelineStoreStates,
        userId: string,
        streamId: string,
        timelineEvent: TimelineEvent,
    ) => {
        return {
            timelines: appendTimelineEvent(streamId, timelineEvent, state.timelines),
            replacedEvents: state.replacedEvents,
            pendingReplacedEvents: state.pendingReplacedEvents,
            threadsStats: addThreadStats(
                streamId,
                timelineEvent,
                state.threadsStats,
                state.timelines[streamId],
                userId,
            ),
            threads: insertThreadEvent(streamId, timelineEvent, state.threads),
            reactions: addReactions(streamId, timelineEvent, state.reactions),
            lastestEventByUser: state.lastestEventByUser,
        }
    }
    const prependEvent = (
        state: TimelineStoreStates,
        userId: string,
        streamId: string,
        inTimelineEvent: TimelineEvent,
    ) => {
        const timelineEvent = state.pendingReplacedEvents[streamId]?.[inTimelineEvent.eventId]
            ? toReplacedMessageEvent(
                  inTimelineEvent,
                  state.pendingReplacedEvents[streamId][inTimelineEvent.eventId],
              )
            : inTimelineEvent
        return {
            timelines: prependTimelineEvent(streamId, timelineEvent, state.timelines),
            replacedEvents: state.replacedEvents,
            pendingReplacedEvents: state.pendingReplacedEvents,
            threadsStats: addThreadStats(
                streamId,
                timelineEvent,
                state.threadsStats,
                state.timelines[streamId],
                userId,
            ),
            threads: insertThreadEvent(streamId, timelineEvent, state.threads),
            reactions: addReactions(streamId, timelineEvent, state.reactions),
            lastestEventByUser: state.lastestEventByUser,
        }
    }

    const replaceEvent = (
        state: TimelineStoreStates,
        userId: string,
        streamId: string,
        replacedMsgId: string,
        timelineEvent: TimelineEvent,
    ) => {
        const timeline = state.timelines[streamId] ?? []
        const eventIndex = timeline.findIndex(
            (e: TimelineEvent) =>
                e.eventId === replacedMsgId ||
                (e.localEventId && e.localEventId === timelineEvent.localEventId),
        )

        if (eventIndex === -1) {
            // if we didn't find an event to replace...
            if (
                state.pendingReplacedEvents[streamId]?.[replacedMsgId] &&
                state.pendingReplacedEvents[streamId][replacedMsgId].latestEventNum >
                    timelineEvent.latestEventNum
            ) {
                // if we already have a replacement here, leave it, because we sync backwards, we assume the first one is the correct one
                return state
            } else {
                // otherwise add it to the pending list
                return {
                    ...state,
                    pendingReplacedEvents: {
                        ...state.pendingReplacedEvents,
                        [streamId]: {
                            ...state.pendingReplacedEvents[streamId],
                            [replacedMsgId]: timelineEvent,
                        },
                    },
                }
            }
        }
        const oldEvent = timeline[eventIndex]
        if (timelineEvent.latestEventNum < oldEvent.latestEventNum) {
            return state
        }
        const newEvent = toReplacedMessageEvent(oldEvent, timelineEvent)

        const threadParentId = newEvent.threadParentId
        const threadTimeline = threadParentId
            ? state.threads[streamId]?.[threadParentId]
            : undefined
        const threadEventIndex =
            threadTimeline?.findIndex(
                (e) =>
                    e.eventId === replacedMsgId ||
                    (e.localEventId && e.localEventId === timelineEvent.localEventId),
            ) ?? -1

        return {
            timelines: replaceTimelineEvent(
                streamId,
                newEvent,
                eventIndex,
                timeline,
                state.timelines,
            ),
            replacedEvents: {
                ...state.replacedEvents,
                [streamId]: [...(state.replacedEvents[streamId] ?? []), { oldEvent, newEvent }],
            },
            pendingReplacedEvents: state.pendingReplacedEvents,
            threadsStats: addThreadStats(
                streamId,
                newEvent,
                removeThreadStat(streamId, oldEvent, state.threadsStats),
                state.timelines[streamId],
                userId,
            ),
            threads:
                threadParentId && threadTimeline && threadEventIndex >= 0
                    ? {
                          ...state.threads,
                          [streamId]: replaceTimelineEvent(
                              threadParentId,
                              newEvent,
                              threadEventIndex,
                              threadTimeline,
                              state.threads[streamId],
                          ),
                      }
                    : threadParentId
                    ? insertThreadEvent(streamId, newEvent, state.threads)
                    : state.threads,
            reactions: addReactions(
                streamId,
                newEvent,
                removeReaction(streamId, oldEvent, state.reactions),
            ),
            lastestEventByUser: state.lastestEventByUser,
        }
    }

    function confirmEvent(
        state: TimelineStoreStates,
        streamId: string,
        confirmation: TimelineEventConfirmation,
    ) {
        // very very similar to replaceEvent, but we only swap out the confirmedInBlockNum and confirmedEventNum
        const timeline = state.timelines[streamId] ?? []
        const eventIndex = timeline.findIndex(
            (e: TimelineEvent) => e.eventId === confirmation.eventId,
        )
        if (eventIndex === -1) {
            return state
        }
        const oldEvent = timeline[eventIndex]
        const newEvent = {
            ...oldEvent,
            confirmedEventNum: confirmation.confirmedEventNum,
            confirmedInBlockNum: confirmation.confirmedInBlockNum,
        }

        const threadParentId = newEvent.threadParentId
        const threadTimeline = threadParentId
            ? state.threads[streamId]?.[threadParentId]
            : undefined
        const threadEventIndex =
            threadTimeline?.findIndex((e) => e.eventId === confirmation.eventId) ?? -1

        return {
            timelines: replaceTimelineEvent(
                streamId,
                newEvent,
                eventIndex,
                timeline,
                state.timelines,
            ),
            replacedEvents: {
                ...state.replacedEvents,
                [streamId]: [...(state.replacedEvents[streamId] ?? []), { oldEvent, newEvent }],
            },
            pendingReplacedEvents: state.pendingReplacedEvents,
            threadsStats: state.threadsStats,
            threads:
                threadParentId && threadTimeline && threadEventIndex >= 0
                    ? {
                          ...state.threads,
                          [streamId]: replaceTimelineEvent(
                              threadParentId,
                              newEvent,
                              threadEventIndex,
                              threadTimeline,
                              state.threads[streamId],
                          ),
                      }
                    : state.threads,
            reactions: state.reactions,
            lastestEventByUser: state.lastestEventByUser,
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
            const redactedEvent = makeRedactionEvent(event)
            state = replaceEvent(state, userId, streamId, redactsEventId, redactedEvent)
            if (updatingEventId) {
                // replace the formerly encrypted event
                state = replaceEvent(state, userId, streamId, updatingEventId, event)
            } else {
                state = appendEvent(state, userId, streamId, event)
            }
        } else if (editsEventId) {
            if (updatingEventId) {
                // remove the formerly encrypted event
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

        const prevLatestEvent = state.lastestEventByUser[event.sender.id]
        if ((prevLatestEvent?.createdAtEpochMs ?? 0) < event.createdAtEpochMs) {
            state = {
                ...state,
                lastestEventByUser: {
                    ...state.lastestEventByUser,
                    [event.sender.id]: event,
                },
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

    function confirmEvents(confirmations: TimelineEventConfirmation[], streamId: string) {
        setState((state) => {
            confirmations.forEach((confirmation) => {
                state = confirmEvent(state, streamId, confirmation)
            })
            return state
        })
    }

    return {
        initializeStream,
        reset,
        appendEvents,
        prependEvents,
        updateEvents,
        updateEvent,
        confirmEvents,
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
            latestEventId: next.eventId,
            latestEventNum: next.eventNum,
            confirmedEventNum: prev.confirmedEventNum ?? next.confirmedEventNum,
            confirmedInBlockNum: prev.confirmedInBlockNum ?? next.confirmedInBlockNum,
            createdAtEpochMs: prev.createdAtEpochMs,
            updatedAtEpochMs: next.createdAtEpochMs,
            content: {
                ...next.content,
                threadId: prev.content.threadId,
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
            latestEventId: next.eventId,
            latestEventNum: next.eventNum,
            confirmedEventNum: prev.confirmedEventNum ?? next.confirmedEventNum,
            confirmedInBlockNum: prev.confirmedInBlockNum ?? next.confirmedInBlockNum,
            createdAtEpochMs: prev.createdAtEpochMs,
            updatedAtEpochMs: next.createdAtEpochMs,
            threadParentId: prev.threadParentId,
            reactionParentId: prev.reactionParentId,
        }
    } else if (prev.content?.kind === ZTEvent.RedactedEvent) {
        // replacing a redacted event should maintain the redacted state
        return {
            ...prev,
            latestEventId: next.eventId,
            latestEventNum: next.eventNum,
            confirmedEventNum: prev.confirmedEventNum ?? next.confirmedEventNum,
            confirmedInBlockNum: prev.confirmedInBlockNum ?? next.confirmedInBlockNum,
        }
    } else {
        // make sure we carry the createdAtEpochMs of the previous event
        // so we don't end up with a timeline that has events out of order.
        return {
            ...next,
            eventId: prev.eventId,
            eventNum: prev.eventNum,
            latestEventId: next.eventId,
            latestEventNum: next.eventNum,
            confirmedEventNum: prev.confirmedEventNum ?? next.confirmedEventNum,
            confirmedInBlockNum: prev.confirmedInBlockNum ?? next.confirmedInBlockNum,
            createdAtEpochMs: prev.createdAtEpochMs,
            updatedAtEpochMs: next.createdAtEpochMs,
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

function addThreadStats(
    streamId: string,
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
            [streamId]: {
                ...threadsStats[streamId],
                [parentId]: addThreadStat(
                    timelineEvent,
                    parentId,
                    threadsStats[streamId]?.[parentId],
                    timeline,
                    userId,
                ),
            },
        }
    }
    // if we are a parent...
    if (threadsStats[streamId]?.[timelineEvent.eventId]) {
        // update ourself in the map
        return {
            ...threadsStats,
            [streamId]: {
                ...threadsStats[streamId],
                [timelineEvent.eventId]: {
                    ...threadsStats[streamId][timelineEvent.eventId],
                    parentEvent: timelineEvent,
                    parentMessageContent: getRoomMessageContent(timelineEvent),
                    isParticipating:
                        threadsStats[streamId][timelineEvent.eventId].isParticipating ||
                        (timelineEvent.content?.kind !== ZTEvent.RedactedEvent &&
                            threadsStats[streamId][timelineEvent.eventId].replyEventIds.size > 0 &&
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
        replyEventIds: new Set<string>(),
        userIds: new Set<string>(),
        latestTs: event.createdAtEpochMs,
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
    updated.replyEventIds.add(event.eventId)
    updated.latestTs = Math.max(updated.latestTs, event.createdAtEpochMs)
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
    streamId: string,
    timelineEvent: TimelineEvent,
    threadsStats: ThreadStatsMap,
) {
    const parentId = timelineEvent.threadParentId
    if (!parentId) {
        return threadsStats
    }
    if (!threadsStats[streamId]?.[parentId]) {
        return threadsStats
    }
    const updated = { ...threadsStats[streamId] }
    const entry = updated[parentId]

    if (entry) {
        entry.replyEventIds.delete(timelineEvent.eventId)
        if (entry.replyEventIds.size === 0) {
            delete updated[parentId]
        } else {
            const senderId = getMessageSenderId(timelineEvent)
            if (senderId) {
                entry.userIds.delete(senderId)
            }
        }
    }
    return { ...threadsStats, [streamId]: updated }
}

function addReactions(
    streamId: string,
    event: TimelineEvent,
    reactions: ReactionsMap,
): ReactionsMap {
    const parentId = event.reactionParentId
    if (!parentId) {
        return reactions
    }
    return {
        ...reactions,
        [streamId]: {
            ...reactions[streamId],
            [parentId]: addReaction(event, reactions[streamId]?.[parentId]),
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
    streamId: string,
    event: TimelineEvent,
    reactions: ReactionsMap,
): ReactionsMap {
    const parentId = event.reactionParentId
    if (!parentId) {
        return reactions
    }
    if (!reactions[streamId]?.[parentId]) {
        return reactions
    }
    const content = event.content?.kind === ZTEvent.Reaction ? event.content : undefined
    if (!content) {
        return reactions
    }
    const reactionName = content.reaction
    const senderId = event.sender.id
    const updated = { ...reactions[streamId] }
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
    return { ...reactions, [streamId]: updated }
}

function removeThreadEvent(
    streamId: string,
    event: TimelineEvent,
    threads: ThreadsMap,
): ThreadsMap {
    const parentId = event.threadParentId
    if (!parentId) {
        return threads
    }
    const threadEventIndex =
        threads[streamId]?.[parentId]?.findIndex((e) => e.eventId === event.eventId) ?? -1
    if (threadEventIndex === -1) {
        return threads
    }
    return {
        ...threads,
        [streamId]: removeTimelineEvent(parentId, threadEventIndex, threads[streamId]),
    }
}

function insertThreadEvent(
    streamId: string,
    timelineEvent: TimelineEvent,
    threads: ThreadsMap,
): ThreadsMap {
    if (!timelineEvent.threadParentId) {
        return threads
    }
    return {
        ...threads,
        [streamId]: insertTimelineEvent(
            timelineEvent.threadParentId,
            timelineEvent,
            threads[streamId] ?? {},
        ),
    }
}

function removeTimelineEvent(
    streamId: string,
    eventIndex: number,
    timelines: TimelinesMap,
): TimelinesMap {
    return {
        ...timelines,
        [streamId]: [
            ...timelines[streamId].slice(0, eventIndex),
            ...timelines[streamId].slice(eventIndex + 1),
        ],
    }
}

function insertTimelineEvent(
    streamId: string,
    timelineEvent: TimelineEvent,
    timelines: TimelinesMap,
) {
    // thread items are decrypted in an unpredictable order, so we need to insert them in the correct order
    return {
        ...timelines,
        [streamId]: [timelineEvent, ...(timelines[streamId] ?? [])].sort((a, b) =>
            a.eventNum > b.eventNum ? 1 : -1,
        ),
    }
}

function appendTimelineEvent(
    streamId: string,
    timelineEvent: TimelineEvent,
    timelines: TimelinesMap,
) {
    return {
        ...timelines,
        [streamId]: [...(timelines[streamId] ?? []), timelineEvent],
    }
}

function prependTimelineEvent(
    streamId: string,
    timelineEvent: TimelineEvent,
    timelines: TimelinesMap,
) {
    return {
        ...timelines,
        [streamId]: [timelineEvent, ...(timelines[streamId] ?? [])],
    }
}

function replaceTimelineEvent(
    streamId: string,
    newEvent: TimelineEvent,
    eventIndex: number,
    timeline: TimelineEvent[],
    timelines: TimelinesMap,
) {
    return {
        ...timelines,
        [streamId]: [...timeline.slice(0, eventIndex), newEvent, ...timeline.slice(eventIndex + 1)],
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
    return content?.kind === ZTEvent.RoomMessage ? content.threadId : undefined
}

export function getReplyParentId(content: TimelineEvent_OneOf | undefined): string | undefined {
    return content?.kind === ZTEvent.RoomMessage ? content.replyId : undefined
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
