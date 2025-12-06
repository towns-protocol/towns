import {
    MessageTipEvent,
    MessageTips,
    ThreadStatsData,
    isMessageTipEvent,
    RiverTimelineEvent,
    type MessageReactions,
    RedactedEvent,
    ChannelMessageEvent,
    TimelineEvent,
    TimelineEventConfirmation,
    getRedactsId,
    getEditsId,
} from '../models/timelineTypes'
import { dlogger } from '@towns-protocol/utils'
import { getFallbackContent } from '../models/timelineEvent'

const logger = dlogger('csb:timelineInterface')

/// TimelinesMap: { streamId: TimelineEvent[] }
export type TimelinesMap = Record<string, TimelineEvent[]>
/// ThreadStatsMap: { streamId: { eventId: ThreadStats } }
export type ThreadStatsMap = Record<string, Record<string, ThreadStatsData>>
/// ThreadContentMap: { streamId: { eventId: ThreadContent } }
export type ThreadsMap = Record<string, TimelinesMap>
/// ReactionsMap: { streamId: { eventId: MessageReactions } }
export type ReactionsMap = Record<string, Record<string, MessageReactions>>
/// TipsMap: { streamId: { eventId: MessageTips } }
export type TipsMap = Record<string, Record<string, MessageTips>>
/// EventIndexMap: { streamId: Map<eventId, arrayIndex> } - O(1) event lookups
export type EventIndexMap = Record<string, Map<string, number>>
/// ThreadEventIndexMap: { streamId: { parentId: Map<eventId, arrayIndex> } } - O(1) thread event lookups
export type ThreadEventIndexMap = Record<string, Record<string, Map<string, number>>>
// store states
export type TimelinesViewModel = {
    timelines: TimelinesMap
    eventIndex: EventIndexMap
    replacedEvents: Record<string, { oldEvent: TimelineEvent; newEvent: TimelineEvent }[]>
    pendingReplacedEvents: Record<string, Record<string, TimelineEvent>>
    threadsStats: ThreadStatsMap
    threads: ThreadsMap
    threadEventIndex: ThreadEventIndexMap
    reactions: ReactionsMap
    tips: TipsMap
    lastestEventByUser: { [userId: string]: TimelineEvent }
}

export interface TimelinesViewInterface {
    initializeStream: (userId: string, streamId: string) => void
    reset: (streamIds: string[]) => void
    appendEvents: (
        events: TimelineEvent[],
        userId: string,
        streamId: string,
        specialFunction?: 'initializeStream',
    ) => void
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

export function makeTimelinesViewInterface(
    setState: (fn: (prevState: TimelinesViewModel) => TimelinesViewModel) => void,
): TimelinesViewInterface {
    const initializeStream = (userId: string, streamId: string) => {
        setState((state) => _initializeStream(state, streamId))
    }

    const _initializeStream = (state: TimelinesViewModel, streamId: string) => {
        const aggregated = {
            threadStats: {} as Record<string, ThreadStatsData>,
            threads: {} as Record<string, TimelineEvent[]>,
            reactions: {} as Record<string, MessageReactions>,
            tips: {} as Record<string, MessageTips>,
        }
        return {
            timelines: { ...state.timelines, [streamId]: [] },
            eventIndex: { ...state.eventIndex, [streamId]: new Map<string, number>() },
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
            threadEventIndex: {
                ...state.threadEventIndex,
                [streamId]: {} as Record<string, Map<string, number>>,
            },
            reactions: {
                ...state.reactions,
                [streamId]: aggregated.reactions,
            },
            tips: {
                ...state.tips,
                [streamId]: aggregated.tips,
            },
            lastestEventByUser: state.lastestEventByUser,
        }
    }

    const reset = (streamIds: string[]) => {
        setState((prev) => {
            for (const streamId of streamIds) {
                delete prev.timelines[streamId]
                delete prev.eventIndex[streamId]
                delete prev.replacedEvents[streamId]
                delete prev.pendingReplacedEvents[streamId]
                delete prev.threadsStats[streamId]
                delete prev.threads[streamId]
                delete prev.threadEventIndex[streamId]
                delete prev.reactions[streamId]
                delete prev.tips[streamId]
            }
            return prev
        })
    }
    const removeEvent = (state: TimelinesViewModel, streamId: string, eventId: string) => {
        // O(1) lookup using eventIndex
        const index = state.eventIndex[streamId]?.get(eventId)
        if (index === undefined) {
            return state
        }
        const event = state.timelines[streamId][index]
        const { timelines: newTimelines, eventIndex: newEventIndex } = removeTimelineEvent(
            streamId,
            index,
            state.timelines,
            state.eventIndex,
        )
        const { threads: newThreads, threadEventIndex: newThreadEventIndex } = removeThreadEvent(
            streamId,
            event,
            state.threads,
            state.threadEventIndex,
        )
        return {
            timelines: newTimelines,
            eventIndex: newEventIndex,
            replacedEvents: state.replacedEvents,
            pendingReplacedEvents: state.pendingReplacedEvents,
            threadsStats: removeThreadStat(streamId, event, state.threadsStats),
            threads: newThreads,
            threadEventIndex: newThreadEventIndex,
            reactions: removeReaction(streamId, event, state.reactions),
            tips: removeTip(streamId, event, state.tips),
            lastestEventByUser: state.lastestEventByUser,
        }
    }
    const appendEvent = (
        state: TimelinesViewModel,
        userId: string,
        streamId: string,
        timelineEvent: TimelineEvent,
    ) => {
        const { timelines: newTimelines, eventIndex: newEventIndex } = appendTimelineEvent(
            streamId,
            timelineEvent,
            state.timelines,
            state.eventIndex,
        )
        const { threads: newThreads, threadEventIndex: newThreadEventIndex } = insertThreadEvent(
            streamId,
            timelineEvent,
            state.threads,
            state.threadEventIndex,
        )
        return {
            timelines: newTimelines,
            eventIndex: newEventIndex,
            replacedEvents: state.replacedEvents,
            pendingReplacedEvents: state.pendingReplacedEvents,
            threadsStats: addThreadStats(
                streamId,
                timelineEvent,
                state.threadsStats,
                state.timelines[streamId],
                state.eventIndex[streamId],
                userId,
            ),
            threads: newThreads,
            threadEventIndex: newThreadEventIndex,
            reactions: addReactions(streamId, timelineEvent, state.reactions),
            tips: addTips(streamId, timelineEvent, state.tips, 'append'),
            lastestEventByUser: state.lastestEventByUser,
        }
    }
    const prependEvent = (
        state: TimelinesViewModel,
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
        const { timelines: newTimelines, eventIndex: newEventIndex } = prependTimelineEvent(
            streamId,
            timelineEvent,
            state.timelines,
            state.eventIndex,
        )
        const { threads: newThreads, threadEventIndex: newThreadEventIndex } = insertThreadEvent(
            streamId,
            timelineEvent,
            state.threads,
            state.threadEventIndex,
        )
        return {
            timelines: newTimelines,
            eventIndex: newEventIndex,
            replacedEvents: state.replacedEvents,
            pendingReplacedEvents: state.pendingReplacedEvents,
            threadsStats: addThreadStats(
                streamId,
                timelineEvent,
                state.threadsStats,
                state.timelines[streamId],
                state.eventIndex[streamId],
                userId,
            ),
            threads: newThreads,
            threadEventIndex: newThreadEventIndex,
            reactions: addReactions(streamId, timelineEvent, state.reactions),
            tips: addTips(streamId, timelineEvent, state.tips, 'prepend'),
            lastestEventByUser: state.lastestEventByUser,
        }
    }

    const replaceEvent = (
        state: TimelinesViewModel,
        userId: string,
        streamId: string,
        replacedMsgId: string,
        timelineEvent: TimelineEvent,
    ) => {
        const timeline = state.timelines[streamId] ?? []
        const indexMap = state.eventIndex[streamId]

        // O(1) lookup by eventId first, then fall back to localEventId scan if needed
        let index = indexMap?.get(replacedMsgId)
        if (index === undefined && timelineEvent.localEventId) {
            // Fall back to localEventId lookup - this is less common, kept as O(n) for now
            index = timeline.findIndex(
                (e: TimelineEvent) => e.localEventId && e.localEventId === timelineEvent.localEventId,
            )
            if (index === -1) index = undefined
        }

        if (index === undefined) {
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
        const oldEvent = timeline[index]
        if (timelineEvent.latestEventNum < oldEvent.latestEventNum) {
            return state
        }
        const newEvent = toReplacedMessageEvent(oldEvent, timelineEvent)

        const threadParentId = newEvent.threadParentId
        const threadIndexMap = threadParentId
            ? state.threadEventIndex[streamId]?.[threadParentId]
            : undefined

        // O(1) lookup for thread event
        let threadIdx = threadIndexMap?.get(replacedMsgId)
        if (threadIdx === undefined && timelineEvent.localEventId && threadParentId) {
            // Fall back to localEventId lookup for thread
            const threadTimeline = state.threads[streamId]?.[threadParentId]
            const foundIdx = threadTimeline?.findIndex(
                (e) => e.localEventId && e.localEventId === timelineEvent.localEventId,
            )
            if (foundIdx !== undefined && foundIdx >= 0) {
                threadIdx = foundIdx
            }
        }

        const threadTimeline = threadParentId ? state.threads[streamId]?.[threadParentId] : undefined

        // Store the replacement in the history (used by unread markers)
        const newReplacedEvents = {
            ...state.replacedEvents,
            [streamId]: [...(state.replacedEvents[streamId] ?? []), { oldEvent, newEvent }],
        }

        // Update timelines and their index
        const { timelines: newTimelines, eventIndex: newEventIndex } = replaceTimelineEvent(
            streamId,
            newEvent,
            index,
            timeline,
            state.timelines,
            state.eventIndex,
            oldEvent.eventId,
        )

        // Handle thread updates
        let newThreads = state.threads
        let newThreadEventIndex = state.threadEventIndex
        if (threadParentId && threadTimeline && threadIdx !== undefined) {
            const result = replaceThreadEvent(
                streamId,
                threadParentId,
                newEvent,
                threadIdx,
                threadTimeline,
                state.threads,
                state.threadEventIndex,
                oldEvent.eventId,
            )
            newThreads = result.threads
            newThreadEventIndex = result.threadEventIndex
        } else if (threadParentId) {
            const result = insertThreadEvent(
                streamId,
                newEvent,
                state.threads,
                state.threadEventIndex,
            )
            newThreads = result.threads
            newThreadEventIndex = result.threadEventIndex
        }

        return {
            timelines: newTimelines,
            eventIndex: newEventIndex,
            replacedEvents: newReplacedEvents,
            pendingReplacedEvents: state.pendingReplacedEvents,
            threadsStats: addThreadStats(
                streamId,
                newEvent,
                removeThreadStat(streamId, oldEvent, state.threadsStats),
                state.timelines[streamId],
                state.eventIndex[streamId],
                userId,
            ),
            threads: newThreads,
            threadEventIndex: newThreadEventIndex,
            reactions: addReactions(
                streamId,
                newEvent,
                removeReaction(streamId, oldEvent, state.reactions),
            ),
            tips: addTips(streamId, newEvent, removeTip(streamId, oldEvent, state.tips), 'append'), // not sure one will ever replace a tip
            lastestEventByUser: state.lastestEventByUser,
        }
    }

    function confirmEvent(
        state: TimelinesViewModel,
        streamId: string,
        confirmation: TimelineEventConfirmation,
    ) {
        // very very similar to replaceEvent, but we only swap out the confirmedInBlockNum and confirmedEventNum
        const timeline = state.timelines[streamId] ?? []
        // O(1) lookup using eventIndex
        const index = state.eventIndex[streamId]?.get(confirmation.eventId)
        if (index === undefined) {
            return state
        }
        const oldEvent = timeline[index]
        const newEvent = {
            ...oldEvent,
            confirmedEventNum: confirmation.confirmedEventNum,
            confirmedInBlockNum: confirmation.confirmedInBlockNum,
            confirmedAtEpochMs: confirmation.confirmedAtEpochMs,
        }

        const threadParentId = newEvent.threadParentId
        // O(1) lookup for thread event
        const threadIdx = threadParentId
            ? state.threadEventIndex[streamId]?.[threadParentId]?.get(confirmation.eventId)
            : undefined
        const threadTimeline = threadParentId
            ? state.threads[streamId]?.[threadParentId]
            : undefined

        // Update timelines and their index (eventId doesn't change for confirmations)
        const { timelines: newTimelines, eventIndex: newEventIndex } = replaceTimelineEvent(
            streamId,
            newEvent,
            index,
            timeline,
            state.timelines,
            state.eventIndex,
            oldEvent.eventId,
        )

        // Handle thread updates
        let newThreads = state.threads
        let newThreadEventIndex = state.threadEventIndex
        if (threadParentId && threadTimeline && threadIdx !== undefined) {
            const result = replaceThreadEvent(
                streamId,
                threadParentId,
                newEvent,
                threadIdx,
                threadTimeline,
                state.threads,
                state.threadEventIndex,
                oldEvent.eventId,
            )
            newThreads = result.threads
            newThreadEventIndex = result.threadEventIndex
        }

        return {
            timelines: newTimelines,
            eventIndex: newEventIndex,
            // Confirmations don't add to replacedEvents - only actual edits do
            replacedEvents: state.replacedEvents,
            pendingReplacedEvents: state.pendingReplacedEvents,
            threadsStats: state.threadsStats,
            threads: newThreads,
            threadEventIndex: newThreadEventIndex,
            reactions: state.reactions,
            tips: state.tips,
            lastestEventByUser: state.lastestEventByUser,
        }
    }

    function processEvent(
        state: TimelinesViewModel,
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

    function appendEvents(
        events: TimelineEvent[],
        userId: string,
        streamId: string,
        specialFunction?: 'initializeStream',
    ) {
        setState((state) => {
            if (specialFunction === 'initializeStream') {
                state = _initializeStream(state, streamId)
            }
            for (const event of events) {
                state = processEvent(state, event, userId, streamId, undefined)
            }
            return state
        })
    }

    function prependEvents(events: TimelineEvent[], userId: string, streamId: string) {
        setState((state) => {
            for (const event of [...events].reverse()) {
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

function canReplaceEvent(prev: TimelineEvent, next: TimelineEvent): boolean {
    if (next.content?.kind === RiverTimelineEvent.RedactedEvent && next.content.isAdminRedaction) {
        return true
    }
    if (next.sender.id === prev.sender.id) {
        return true
    }
    logger.info('cannot replace event', { prev, next })
    return false
}

function toReplacedMessageEvent(prev: TimelineEvent, next: TimelineEvent): TimelineEvent {
    const isLocalId = prev.eventId.startsWith('~')
    if (!canReplaceEvent(prev, next)) {
        return prev
    } else if (
        next.content?.kind === RiverTimelineEvent.ChannelMessage &&
        prev.content?.kind === RiverTimelineEvent.ChannelMessage
    ) {
        // when we replace an event, we copy the content up to the root event
        // so we keep the prev id, but use the next content
        const eventId = !isLocalId ? prev.eventId : next.eventId

        return {
            ...next,
            eventId: eventId,
            eventNum: prev.eventNum,
            latestEventId: next.eventId,
            latestEventNum: next.eventNum,
            confirmedEventNum: prev.confirmedEventNum ?? next.confirmedEventNum,
            confirmedInBlockNum: prev.confirmedInBlockNum ?? next.confirmedInBlockNum,
            confirmedAtEpochMs: next.confirmedAtEpochMs,
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
    } else if (next.content?.kind === RiverTimelineEvent.RedactedEvent) {
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
            confirmedAtEpochMs: next.confirmedAtEpochMs,
            createdAtEpochMs: prev.createdAtEpochMs,
            updatedAtEpochMs: next.createdAtEpochMs,
            threadParentId: prev.threadParentId,
            reactionParentId: prev.reactionParentId,
        }
    } else if (prev.content?.kind === RiverTimelineEvent.RedactedEvent) {
        // replacing a redacted event should maintain the redacted state
        return {
            ...prev,
            latestEventId: next.eventId,
            latestEventNum: next.eventNum,
            confirmedEventNum: prev.confirmedEventNum ?? next.confirmedEventNum,
            confirmedInBlockNum: prev.confirmedInBlockNum ?? next.confirmedInBlockNum,
            confirmedAtEpochMs: next.confirmedAtEpochMs,
        }
    } else {
        // make sure we carry the createdAtEpochMs of the previous event
        // so we don't end up with a timeline that has events out of order.
        const eventId = isLocalId ? next.eventId : prev.eventId
        return {
            ...next,
            eventId: eventId,
            eventNum: prev.eventNum,
            latestEventId: next.eventId,
            latestEventNum: next.eventNum,
            confirmedEventNum: prev.confirmedEventNum ?? next.confirmedEventNum,
            confirmedInBlockNum: prev.confirmedInBlockNum ?? next.confirmedInBlockNum,
            confirmedAtEpochMs: next.confirmedAtEpochMs,
            createdAtEpochMs: prev.createdAtEpochMs,
            updatedAtEpochMs: next.createdAtEpochMs,
        }
    }
}

function makeRedactionEvent(redactionAction: TimelineEvent): TimelineEvent {
    if (redactionAction.content?.kind !== RiverTimelineEvent.RedactionActionEvent) {
        throw new Error('makeRedactionEvent called with non-redaction action event')
    }
    const newContent = {
        kind: RiverTimelineEvent.RedactedEvent,
        isAdminRedaction: redactionAction.content.adminRedaction,
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
    eventIndex: Map<string, number> | undefined,
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
                    eventIndex,
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
                    parentMessageContent: getChannelMessageContent(timelineEvent),
                    isParticipating:
                        threadsStats[streamId][timelineEvent.eventId].isParticipating ||
                        (timelineEvent.content?.kind !== RiverTimelineEvent.RedactedEvent &&
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
    eventIndex?: Map<string, number>,
): ThreadStatsData {
    // O(1) lookup using eventIndex instead of O(n) find
    let parent: TimelineEvent | undefined
    if (timeline && eventIndex) {
        const idx = eventIndex.get(parentId)
        if (idx !== undefined) {
            parent = timeline[idx]
        }
    } else if (timeline) {
        // Fallback to O(n) if no index available
        parent = timeline.find((t) => t.eventId === parentId)
    }
    return {
        replyEventIds: new Set<string>(),
        userIds: new Set<string>(),
        latestTs: event.createdAtEpochMs,
        parentId,
        parentEvent: parent,
        parentMessageContent: getChannelMessageContent(parent),
        isParticipating: false,
    }
}

function addThreadStat(
    event: TimelineEvent,
    parentId: string,
    entry: ThreadStatsData | undefined,
    timeline: TimelineEvent[] | undefined,
    eventIndex: Map<string, number> | undefined,
    userId: string,
): ThreadStatsData {
    const updated = entry ? { ...entry } : makeNewThreadStats(event, parentId, timeline, eventIndex)
    if (event.content?.kind === RiverTimelineEvent.RedactedEvent) {
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

function addTips(
    streamId: string,
    event: TimelineEvent,
    tips: TipsMap,
    direction: 'append' | 'prepend',
): TipsMap {
    if (!isMessageTipEvent(event)) {
        return tips
    }
    // note to future self, if anyone starts uploading the same transaction multiple times,
    // store the tips in a Record keyed by transactionHash instead of eventId
    return {
        ...tips,
        [streamId]: addTip(event, tips[streamId], direction),
    }
}

function addTip(
    event: MessageTipEvent,
    tips: Record<string, MessageTips> | undefined,
    direction: 'append' | 'prepend',
): Record<string, MessageTips> {
    const refEventId = event.content.refEventId
    if (!tips) {
        return {
            [refEventId]: [event],
        }
    }
    if (direction === 'append') {
        return {
            ...tips,
            [refEventId]: [...(tips[refEventId] ?? []), event],
        }
    } else {
        return {
            ...tips,
            [refEventId]: [event, ...(tips[refEventId] ?? [])],
        }
    }
}

function removeTip(streamId: string, event: TimelineEvent, tips: TipsMap): TipsMap {
    if (!isMessageTipEvent(event)) {
        return tips
    }
    const refEventId = event.content.refEventId
    if (!tips[streamId]?.[refEventId]) {
        return tips
    }
    return {
        ...tips,
        [streamId]: {
            ...tips[streamId],
            [refEventId]: tips[streamId][refEventId].filter((t) => t.eventId !== event.eventId),
        },
    }
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
    const content = event.content?.kind === RiverTimelineEvent.Reaction ? event.content : undefined
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
    const content = event.content?.kind === RiverTimelineEvent.Reaction ? event.content : undefined
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
    threadEventIndex: ThreadEventIndexMap,
): { threads: ThreadsMap; threadEventIndex: ThreadEventIndexMap } {
    const parentId = event.threadParentId
    if (!parentId) {
        return { threads, threadEventIndex }
    }
    // O(1) lookup using threadEventIndex
    const index = threadEventIndex[streamId]?.[parentId]?.get(event.eventId)
    if (index === undefined) {
        return { threads, threadEventIndex }
    }

    const threadTimeline = threads[streamId]?.[parentId] ?? []
    const newThreadTimeline = [
        ...threadTimeline.slice(0, index),
        ...threadTimeline.slice(index + 1),
    ]

    // Update the index - need to decrement all indices after the removed element
    const newParentIndex = new Map(threadEventIndex[streamId]?.[parentId])
    newParentIndex.delete(event.eventId)
    for (const [eventId, idx] of newParentIndex) {
        if (idx > index) {
            newParentIndex.set(eventId, idx - 1)
        }
    }

    return {
        threads: {
            ...threads,
            [streamId]: {
                ...threads[streamId],
                [parentId]: newThreadTimeline,
            },
        },
        threadEventIndex: {
            ...threadEventIndex,
            [streamId]: {
                ...threadEventIndex[streamId],
                [parentId]: newParentIndex,
            },
        },
    }
}

// Phase 2: Binary insertion for thread events - O(n) instead of O(n log n)
function binaryInsertByEventNum(events: TimelineEvent[], event: TimelineEvent): number {
    let low = 0
    let high = events.length
    while (low < high) {
        const mid = (low + high) >>> 1
        if (events[mid].eventNum < event.eventNum) {
            low = mid + 1
        } else {
            high = mid
        }
    }
    return low
}

function insertThreadEvent(
    streamId: string,
    timelineEvent: TimelineEvent,
    threads: ThreadsMap,
    threadEventIndex: ThreadEventIndexMap,
): { threads: ThreadsMap; threadEventIndex: ThreadEventIndexMap } {
    if (!timelineEvent.threadParentId) {
        return { threads, threadEventIndex }
    }

    const parentId = timelineEvent.threadParentId
    const existingTimeline = threads[streamId]?.[parentId] ?? []

    // Phase 2: Binary insertion instead of sort - O(n) instead of O(n log n)
    const insertIndex = binaryInsertByEventNum(existingTimeline, timelineEvent)
    const newTimeline = [
        ...existingTimeline.slice(0, insertIndex),
        timelineEvent,
        ...existingTimeline.slice(insertIndex),
    ]

    // Update the thread event index
    const existingIndex = threadEventIndex[streamId]?.[parentId] ?? new Map()
    const newParentIndex = new Map(existingIndex)

    // Shift indices for events after the insertion point
    for (const [eventId, idx] of newParentIndex) {
        if (idx >= insertIndex) {
            newParentIndex.set(eventId, idx + 1)
        }
    }
    newParentIndex.set(timelineEvent.eventId, insertIndex)

    return {
        threads: {
            ...threads,
            [streamId]: {
                ...threads[streamId],
                [parentId]: newTimeline,
            },
        },
        threadEventIndex: {
            ...threadEventIndex,
            [streamId]: {
                ...threadEventIndex[streamId],
                [parentId]: newParentIndex,
            },
        },
    }
}

function replaceThreadEvent(
    streamId: string,
    parentId: string,
    newEvent: TimelineEvent,
    index: number,
    threadTimeline: TimelineEvent[],
    threads: ThreadsMap,
    threadEventIndex: ThreadEventIndexMap,
    oldEventId: string,
): { threads: ThreadsMap; threadEventIndex: ThreadEventIndexMap } {
    const newTimeline = [
        ...threadTimeline.slice(0, index),
        newEvent,
        ...threadTimeline.slice(index + 1),
    ]

    // Update index if eventId changed
    let newParentIndex = threadEventIndex[streamId]?.[parentId]
    if (oldEventId !== newEvent.eventId) {
        newParentIndex = new Map(newParentIndex)
        newParentIndex.delete(oldEventId)
        newParentIndex.set(newEvent.eventId, index)
    }

    return {
        threads: {
            ...threads,
            [streamId]: {
                ...threads[streamId],
                [parentId]: newTimeline,
            },
        },
        threadEventIndex: {
            ...threadEventIndex,
            [streamId]: {
                ...threadEventIndex[streamId],
                [parentId]: newParentIndex ?? new Map(),
            },
        },
    }
}

function removeTimelineEvent(
    streamId: string,
    index: number,
    timelines: TimelinesMap,
    eventIndex: EventIndexMap,
): { timelines: TimelinesMap; eventIndex: EventIndexMap } {
    const timeline = timelines[streamId]
    const removedEvent = timeline[index]
    const newTimeline = [
        ...timeline.slice(0, index),
        ...timeline.slice(index + 1),
    ]

    // Update the index - need to decrement all indices after the removed element
    const newIndex = new Map(eventIndex[streamId])
    newIndex.delete(removedEvent.eventId)
    for (const [eventId, idx] of newIndex) {
        if (idx > index) {
            newIndex.set(eventId, idx - 1)
        }
    }

    return {
        timelines: {
            ...timelines,
            [streamId]: newTimeline,
        },
        eventIndex: {
            ...eventIndex,
            [streamId]: newIndex,
        },
    }
}

function appendTimelineEvent(
    streamId: string,
    timelineEvent: TimelineEvent,
    timelines: TimelinesMap,
    eventIndex: EventIndexMap,
): { timelines: TimelinesMap; eventIndex: EventIndexMap } {
    const existingTimeline = timelines[streamId] ?? []
    const newIndex = existingTimeline.length

    // Update the index
    const existingIndex = eventIndex[streamId] ?? new Map()
    const newEventIndex = new Map(existingIndex)
    newEventIndex.set(timelineEvent.eventId, newIndex)

    return {
        timelines: {
            ...timelines,
            [streamId]: [...existingTimeline, timelineEvent],
        },
        eventIndex: {
            ...eventIndex,
            [streamId]: newEventIndex,
        },
    }
}

function prependTimelineEvent(
    streamId: string,
    timelineEvent: TimelineEvent,
    timelines: TimelinesMap,
    eventIndex: EventIndexMap,
): { timelines: TimelinesMap; eventIndex: EventIndexMap } {
    const existingTimeline = timelines[streamId] ?? []

    // Update the index - shift all existing indices by 1 and add new event at 0
    const existingIndex = eventIndex[streamId] ?? new Map()
    const newEventIndex = new Map<string, number>()
    newEventIndex.set(timelineEvent.eventId, 0)
    for (const [eventId, idx] of existingIndex) {
        newEventIndex.set(eventId, idx + 1)
    }

    return {
        timelines: {
            ...timelines,
            [streamId]: [timelineEvent, ...existingTimeline],
        },
        eventIndex: {
            ...eventIndex,
            [streamId]: newEventIndex,
        },
    }
}

function replaceTimelineEvent(
    streamId: string,
    newEvent: TimelineEvent,
    index: number,
    timeline: TimelineEvent[],
    timelines: TimelinesMap,
    eventIndex: EventIndexMap,
    oldEventId: string,
): { timelines: TimelinesMap; eventIndex: EventIndexMap } {
    const newTimeline = [...timeline.slice(0, index), newEvent, ...timeline.slice(index + 1)]

    // Update index if eventId changed
    let newEventIndex = eventIndex[streamId]
    if (oldEventId !== newEvent.eventId) {
        newEventIndex = new Map(newEventIndex)
        newEventIndex.delete(oldEventId)
        newEventIndex.set(newEvent.eventId, index)
    }

    return {
        timelines: {
            ...timelines,
            [streamId]: newTimeline,
        },
        eventIndex: {
            ...eventIndex,
            [streamId]: newEventIndex ?? new Map(),
        },
    }
}

function getChannelMessageContent(event?: TimelineEvent): ChannelMessageEvent | undefined {
    return event?.content?.kind === RiverTimelineEvent.ChannelMessage ? event.content : undefined
}

function getMessageSenderId(event: TimelineEvent): string | undefined {
    if (
        event.content?.kind === RiverTimelineEvent.ChannelMessage ||
        event.content?.kind === RiverTimelineEvent.TokenTransfer
    ) {
        return event.sender.id
    }
    return undefined
}
