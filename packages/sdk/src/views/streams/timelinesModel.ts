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
import { dlogger } from '@towns-protocol/dlog'
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
// store states
export type TimelinesViewModel = {
    timelines: TimelinesMap
    replacedEvents: Record<string, { oldEvent: TimelineEvent; newEvent: TimelineEvent }[]>
    pendingReplacedEvents: Record<string, Record<string, TimelineEvent>>
    threadsStats: ThreadStatsMap
    threads: ThreadsMap
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
                delete prev.replacedEvents[streamId]
                delete prev.pendingReplacedEvents[streamId]
                delete prev.threadsStats[streamId]
                delete prev.threads[streamId]
                delete prev.reactions[streamId]
                delete prev.tips[streamId]
            }
            return prev
        })
    }
    const removeEvent = (state: TimelinesViewModel, streamId: string, eventId: string) => {
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
): ThreadStatsData {
    const parent = timeline?.find((t) => t.eventId === parentId) // one time lookup of the parent message for the first reply
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
    userId: string,
): ThreadStatsData {
    const updated = entry ? { ...entry } : makeNewThreadStats(event, parentId, timeline)
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
