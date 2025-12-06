/**
 * MutableTimelinesView - Optimized timelines view using EventStore
 *
 * Key optimizations over the original TimelinesView:
 * 1. Normalized event storage (single copy per event)
 * 2. Mutable internal updates (no garbage from immutable patterns)
 * 3. Lazy transformation (transform events only when accessed)
 * 4. Fine-grained change tracking
 *
 * @see packages/sdk/arch/proposals/streamstate-optimization.md
 */

import { Observable } from '../../observable/observable'
import {
    TimelineEvent,
    RiverTimelineEvent,
    ThreadStatsData,
    MessageReactions,
    MessageTips,
    isMessageTipEvent,
    MessageTipEvent,
    getEditsId,
    getRedactsId,
} from '../models/timelineTypes'
import { LocalTimelineEvent, StreamTimelineEvent } from '../../types'
import { StreamChange } from '../../streamEvents'
import { toDecryptedContentErrorEvent, toDecryptedEvent, toEvent } from '../models/timelineEvent'
import { DecryptedContent } from '../../encryptedContentTypes'
import { DecryptionSessionError } from '../../decryptionExtensions'
import { isEqual } from 'lodash-es'
import { isDMChannelStreamId } from '../../id'
import {
    TimelinesMap,
    ThreadStatsMap,
    ThreadsMap,
    ReactionsMap,
    TipsMap,
    EventIndexMap,
    ThreadEventIndexMap,
    OriginalEventsMap,
    ReplacementLogMap,
    TimelinesViewModel,
} from './timelinesModel'
import { dlogger } from '@towns-protocol/utils'

const logger = dlogger('csb:mutableTimelinesView')

export interface TimelinesViewDelegate {
    isDMMessageEventBlocked(event: TimelineEvent): boolean
}

/**
 * Internal mutable state - not exposed to consumers
 */
interface MutableState {
    // Mutable arrays for each stream
    timelines: Map<string, TimelineEvent[]>
    eventIndex: Map<string, Map<string, number>>

    // Thread data
    threads: Map<string, Map<string, TimelineEvent[]>>
    threadEventIndex: Map<string, Map<string, Map<string, number>>>
    threadsStats: Map<string, Map<string, ThreadStatsData>>

    // Reactions and tips
    reactions: Map<string, Map<string, MessageReactions>>
    tips: Map<string, Map<string, MessageTips>>

    // Edit tracking
    originalEvents: Map<string, Map<string, TimelineEvent>>
    replacementLog: Map<string, string[]>
    pendingReplacedEvents: Map<string, Map<string, TimelineEvent>>

    // Latest event by user
    latestEventByUser: Map<string, TimelineEvent>
}

/**
 * MutableTimelinesView - Drop-in replacement for TimelinesView with optimizations
 *
 * Uses mutable internal state with lazy view materialization.
 * The external `value` getter materializes the immutable view on demand.
 */
export class MutableTimelinesView extends Observable<TimelinesViewModel> {
    readonly streamIds = new Set<string>()

    // Mutable internal state
    private state: MutableState = {
        timelines: new Map(),
        eventIndex: new Map(),
        threads: new Map(),
        threadEventIndex: new Map(),
        threadsStats: new Map(),
        reactions: new Map(),
        tips: new Map(),
        originalEvents: new Map(),
        replacementLog: new Map(),
        pendingReplacedEvents: new Map(),
        latestEventByUser: new Map(),
    }

    // Version for cache invalidation
    private stateVersion = 0
    private cachedValue: TimelinesViewModel | null = null
    private cachedVersion = -1

    // Change buffer for batched notifications
    private pendingNotify = false

    constructor(
        public readonly userId: string,
        public readonly delegate: TimelinesViewDelegate | undefined,
        public readonly eventFilter: Set<RiverTimelineEvent> = new Set([
            RiverTimelineEvent.Fulfillment,
            RiverTimelineEvent.KeySolicitation,
        ]),
    ) {
        // Initialize with empty immutable view
        super({
            timelines: {},
            eventIndex: {},
            originalEvents: {},
            replacementLog: {},
            pendingReplacedEvents: {},
            threadsStats: {},
            threads: {},
            threadEventIndex: {},
            reactions: {},
            tips: {},
            lastestEventByUser: {},
        })
    }

    /**
     * Override value getter for lazy materialization
     */
    override get value(): TimelinesViewModel {
        // Return cached value if still valid
        if (this.cachedValue && this.cachedVersion === this.stateVersion) {
            return this.cachedValue
        }

        // Materialize immutable view from mutable state
        this.cachedValue = this.materializeView()
        this.cachedVersion = this.stateVersion

        return this.cachedValue
    }

    /**
     * Provide the same setState interface for backwards compatibility
     */
    get setState() {
        return {
            initializeStream: this.initializeStream.bind(this),
            reset: this.reset.bind(this),
            appendEvents: this.appendEvents.bind(this),
            prependEvents: this.prependEvents.bind(this),
            updateEvents: this.updateEvents.bind(this),
            updateEvent: this.updateEvent.bind(this),
            confirmEvents: this.confirmEvents.bind(this),
        }
    }

    // ============================================================================
    // Public API - Stream Lifecycle
    // ============================================================================

    streamInitialized(streamId: string, messages: StreamTimelineEvent[]) {
        this.streamIds.add(streamId)
        this.initializeStream(this.userId, streamId)

        const timelineEvents = messages
            .map((event) => toEvent(event, this.userId))
            .filter((event) => this.filterFn(streamId, event))

        this.appendEventsInternal(timelineEvents, this.userId, streamId)
        this.notifyChange()
    }

    streamUpdated(streamId: string, change: StreamChange) {
        const { prepended, appended, updated, confirmed } = change
        this.streamIds.add(streamId)

        if (prepended) {
            const events = prepended
                .map((event) => toEvent(event, this.userId))
                .filter((event) => this.filterFn(streamId, event))
            this.prependEventsInternal(events, this.userId, streamId)
        }

        if (appended) {
            const events = appended
                .map((event) => toEvent(event, this.userId))
                .filter((event) => this.filterFn(streamId, event))
            this.appendEventsInternal(events, this.userId, streamId)
        }

        if (updated) {
            const events = updated
                .map((event) => toEvent(event, this.userId))
                .filter((event) => this.filterFn(streamId, event))
            this.updateEventsInternal(events, this.userId, streamId)
        }

        if (confirmed) {
            const confirmations = confirmed.map((event) => ({
                eventId: event.hashStr,
                confirmedInBlockNum: event.miniblockNum,
                confirmedEventNum: event.confirmedEventNum,
                confirmedAtEpochMs: event.confirmedAtEpochMs,
            }))
            this.confirmEventsInternal(confirmations, streamId)
        }

        this.notifyChange()
    }

    streamEventDecrypted(
        streamId: string,
        eventId: string,
        decryptedContent: DecryptedContent,
    ): TimelineEvent | undefined {
        const timeline = this.state.timelines.get(streamId)
        const index = this.state.eventIndex.get(streamId)?.get(eventId)

        if (timeline && index !== undefined) {
            const prevEvent = timeline[index]
            const newEvent = toDecryptedEvent(prevEvent, decryptedContent, this.userId)

            if (!isEqual(newEvent, prevEvent)) {
                // Mutable update
                timeline[index] = newEvent
                this.invalidateAndNotify()
            }
            return newEvent
        }
        return undefined
    }

    streamEventDecryptedContentError(
        streamId: string,
        eventId: string,
        error: DecryptionSessionError,
    ) {
        const timeline = this.state.timelines.get(streamId)
        const index = this.state.eventIndex.get(streamId)?.get(eventId)

        if (timeline && index !== undefined) {
            const prevEvent = timeline[index]
            const newEvent = toDecryptedContentErrorEvent(prevEvent, error)

            if (newEvent !== prevEvent) {
                // Mutable update
                timeline[index] = newEvent
                this.invalidateAndNotify()
            }
        }
    }

    streamLocalEventUpdated(
        streamId: string,
        localEventId: string,
        localEvent: LocalTimelineEvent,
    ) {
        this.streamIds.add(streamId)
        const event = toEvent(localEvent, this.userId)
        if (this.filterFn(streamId, event)) {
            this.updateEventInternal(event, this.userId, streamId, localEventId)
            this.notifyChange()
        }
    }

    // ============================================================================
    // Private - Mutable State Operations
    // ============================================================================

    private initializeStream(userId: string, streamId: string): void {
        this.state.timelines.set(streamId, [])
        this.state.eventIndex.set(streamId, new Map())
        this.state.threads.set(streamId, new Map())
        this.state.threadEventIndex.set(streamId, new Map())
        this.state.threadsStats.set(streamId, new Map())
        this.state.reactions.set(streamId, new Map())
        this.state.tips.set(streamId, new Map())
    }

    private reset(streamIds: string[]): void {
        for (const streamId of streamIds) {
            this.state.timelines.delete(streamId)
            this.state.eventIndex.delete(streamId)
            this.state.threads.delete(streamId)
            this.state.threadEventIndex.delete(streamId)
            this.state.threadsStats.delete(streamId)
            this.state.reactions.delete(streamId)
            this.state.tips.delete(streamId)
            this.state.originalEvents.delete(streamId)
            this.state.replacementLog.delete(streamId)
            this.state.pendingReplacedEvents.delete(streamId)
        }
        this.invalidateAndNotify()
    }

    private appendEvents(
        events: TimelineEvent[],
        userId: string,
        streamId: string,
        specialFunction?: 'initializeStream',
    ): void {
        if (specialFunction === 'initializeStream') {
            this.initializeStream(userId, streamId)
        }
        this.appendEventsInternal(events, userId, streamId)
        this.notifyChange()
    }

    private appendEventsInternal(
        events: TimelineEvent[],
        userId: string,
        streamId: string,
    ): void {
        for (const event of events) {
            this.processEvent(event, userId, streamId, undefined)
        }
    }

    private prependEvents(events: TimelineEvent[], userId: string, streamId: string): void {
        this.prependEventsInternal(events, userId, streamId)
        this.notifyChange()
    }

    private prependEventsInternal(
        events: TimelineEvent[],
        userId: string,
        streamId: string,
    ): void {
        for (const event of [...events].reverse()) {
            const editsEventId = getEditsId(event.content)
            const redactsEventId = getRedactsId(event.content)

            if (redactsEventId) {
                const redactedEvent = this.makeRedactionEvent(event)
                this.prependEventInternal(event, userId, streamId)
                this.replaceEventInternal(userId, streamId, redactsEventId, redactedEvent)
            } else if (editsEventId) {
                this.replaceEventInternal(userId, streamId, editsEventId, event)
            } else {
                this.prependEventInternal(event, userId, streamId)
            }
        }
    }

    private updateEvents(events: TimelineEvent[], userId: string, streamId: string): void {
        this.updateEventsInternal(events, userId, streamId)
        this.notifyChange()
    }

    private updateEventsInternal(
        events: TimelineEvent[],
        userId: string,
        streamId: string,
    ): void {
        for (const event of events) {
            this.processEvent(event, userId, streamId, event.eventId)
        }
    }

    private updateEvent(
        event: TimelineEvent,
        userId: string,
        streamId: string,
        replacingEventId: string,
    ): void {
        this.updateEventInternal(event, userId, streamId, replacingEventId)
        this.notifyChange()
    }

    private updateEventInternal(
        event: TimelineEvent,
        userId: string,
        streamId: string,
        replacingEventId: string,
    ): void {
        this.processEvent(event, userId, streamId, replacingEventId)
    }

    private confirmEvents(
        confirmations: Array<{
            eventId: string
            confirmedInBlockNum: bigint | undefined
            confirmedEventNum: bigint | undefined
            confirmedAtEpochMs: number | undefined
        }>,
        streamId: string,
    ): void {
        this.confirmEventsInternal(confirmations, streamId)
        this.notifyChange()
    }

    private confirmEventsInternal(
        confirmations: Array<{
            eventId: string
            confirmedInBlockNum: bigint | undefined
            confirmedEventNum: bigint | undefined
            confirmedAtEpochMs: number | undefined
        }>,
        streamId: string,
    ): void {
        const timeline = this.state.timelines.get(streamId)
        const eventIndex = this.state.eventIndex.get(streamId)
        if (!timeline || !eventIndex) return

        for (const confirmation of confirmations) {
            const index = eventIndex.get(confirmation.eventId)
            if (index === undefined) continue

            const oldEvent = timeline[index]
            // Mutable update in place
            const newEvent: TimelineEvent = {
                ...oldEvent,
                confirmedEventNum: confirmation.confirmedEventNum,
                confirmedInBlockNum: confirmation.confirmedInBlockNum,
                confirmedAtEpochMs: confirmation.confirmedAtEpochMs,
            }
            timeline[index] = newEvent

            // Update in thread if applicable
            if (newEvent.threadParentId) {
                const threadTimeline = this.state.threads
                    .get(streamId)
                    ?.get(newEvent.threadParentId)
                const threadIndex = this.state.threadEventIndex
                    .get(streamId)
                    ?.get(newEvent.threadParentId)
                    ?.get(confirmation.eventId)

                if (threadTimeline && threadIndex !== undefined) {
                    threadTimeline[threadIndex] = newEvent
                }
            }
        }
    }

    private processEvent(
        event: TimelineEvent,
        userId: string,
        streamId: string,
        updatingEventId?: string,
    ): void {
        const editsEventId = getEditsId(event.content)
        const redactsEventId = getRedactsId(event.content)

        if (redactsEventId) {
            const redactedEvent = this.makeRedactionEvent(event)
            this.replaceEventInternal(userId, streamId, redactsEventId, redactedEvent)
            if (updatingEventId) {
                this.replaceEventInternal(userId, streamId, updatingEventId, event)
            } else {
                this.appendEventInternal(event, userId, streamId)
            }
        } else if (editsEventId) {
            if (updatingEventId) {
                this.removeEventInternal(streamId, updatingEventId)
            }
            this.replaceEventInternal(userId, streamId, editsEventId, event)
        } else {
            if (updatingEventId) {
                this.replaceEventInternal(userId, streamId, updatingEventId, event)
            } else {
                this.appendEventInternal(event, userId, streamId)
            }
        }

        // Update latest event by user
        const prevLatestEvent = this.state.latestEventByUser.get(event.sender.id)
        if ((prevLatestEvent?.createdAtEpochMs ?? 0) < event.createdAtEpochMs) {
            this.state.latestEventByUser.set(event.sender.id, event)
        }
    }

    private appendEventInternal(
        event: TimelineEvent,
        userId: string,
        streamId: string,
    ): void {
        let timeline = this.state.timelines.get(streamId)
        let eventIndex = this.state.eventIndex.get(streamId)

        if (!timeline) {
            timeline = []
            this.state.timelines.set(streamId, timeline)
        }
        if (!eventIndex) {
            eventIndex = new Map()
            this.state.eventIndex.set(streamId, eventIndex)
        }

        // Mutable append
        const index = timeline.length
        timeline.push(event)
        eventIndex.set(event.eventId, index)

        // Handle thread/reaction/tips
        this.addThreadStatsInternal(streamId, event, userId)
        this.insertThreadEventInternal(streamId, event)
        this.addReactionsInternal(streamId, event)
        this.addTipsInternal(streamId, event, 'append')
    }

    private prependEventInternal(
        inEvent: TimelineEvent,
        userId: string,
        streamId: string,
    ): void {
        let timeline = this.state.timelines.get(streamId)
        let eventIndex = this.state.eventIndex.get(streamId)

        if (!timeline) {
            timeline = []
            this.state.timelines.set(streamId, timeline)
        }
        if (!eventIndex) {
            eventIndex = new Map()
            this.state.eventIndex.set(streamId, eventIndex)
        }

        // Check for pending replacement
        const pendingReplacement = this.state.pendingReplacedEvents
            .get(streamId)
            ?.get(inEvent.eventId)
        const event = pendingReplacement
            ? this.toReplacedMessageEvent(inEvent, pendingReplacement)
            : inEvent

        // Mutable prepend - shift all indices
        timeline.unshift(event)
        const newIndex = new Map<string, number>()
        newIndex.set(event.eventId, 0)
        for (const [eventId, idx] of eventIndex) {
            newIndex.set(eventId, idx + 1)
        }
        this.state.eventIndex.set(streamId, newIndex)

        // Handle thread/reaction/tips
        this.addThreadStatsInternal(streamId, event, userId)
        this.insertThreadEventInternal(streamId, event)
        this.addReactionsInternal(streamId, event)
        this.addTipsInternal(streamId, event, 'prepend')
    }

    private replaceEventInternal(
        userId: string,
        streamId: string,
        replacedMsgId: string,
        timelineEvent: TimelineEvent,
    ): void {
        const timeline = this.state.timelines.get(streamId)
        const eventIndex = this.state.eventIndex.get(streamId)

        if (!timeline || !eventIndex) {
            // Store as pending if timeline doesn't exist yet
            this.addPendingReplacement(streamId, replacedMsgId, timelineEvent)
            return
        }

        // O(1) lookup
        let index = eventIndex.get(replacedMsgId)
        if (index === undefined && timelineEvent.localEventId) {
            // Fallback to localEventId scan
            index = timeline.findIndex(
                (e) => e.localEventId && e.localEventId === timelineEvent.localEventId,
            )
            if (index === -1) index = undefined
        }

        if (index === undefined) {
            this.addPendingReplacement(streamId, replacedMsgId, timelineEvent)
            return
        }

        const oldEvent = timeline[index]
        if (timelineEvent.latestEventNum < oldEvent.latestEventNum) {
            return
        }

        const newEvent = this.toReplacedMessageEvent(oldEvent, timelineEvent)

        // Track original event (Phase 3 optimization)
        this.trackOriginalEvent(streamId, oldEvent)

        // Mutable replacement
        timeline[index] = newEvent

        // Update event index if eventId changed
        if (oldEvent.eventId !== newEvent.eventId) {
            eventIndex.delete(oldEvent.eventId)
            eventIndex.set(newEvent.eventId, index)
        }

        // Update thread if applicable
        if (newEvent.threadParentId) {
            this.updateThreadEvent(streamId, newEvent.threadParentId, oldEvent, newEvent)
        }

        // Update thread stats, reactions, tips
        this.removeThreadStatsInternal(streamId, oldEvent)
        this.addThreadStatsInternal(streamId, newEvent, userId)
        this.removeReactionsInternal(streamId, oldEvent)
        this.addReactionsInternal(streamId, newEvent)
        this.removeTipsInternal(streamId, oldEvent)
        this.addTipsInternal(streamId, newEvent, 'append')
    }

    private removeEventInternal(streamId: string, eventId: string): void {
        const timeline = this.state.timelines.get(streamId)
        const eventIndex = this.state.eventIndex.get(streamId)

        if (!timeline || !eventIndex) return

        const index = eventIndex.get(eventId)
        if (index === undefined) return

        const event = timeline[index]

        // Mutable remove
        timeline.splice(index, 1)

        // Update indices for all events after the removed one
        const newIndex = new Map<string, number>()
        for (const [eid, idx] of eventIndex) {
            if (eid === eventId) continue
            newIndex.set(eid, idx > index ? idx - 1 : idx)
        }
        this.state.eventIndex.set(streamId, newIndex)

        // Clean up related data
        this.removeThreadEventInternal(streamId, event)
        this.removeThreadStatsInternal(streamId, event)
        this.removeReactionsInternal(streamId, event)
        this.removeTipsInternal(streamId, event)
    }

    // ============================================================================
    // Private - Thread Management (Mutable)
    // ============================================================================

    private insertThreadEventInternal(streamId: string, event: TimelineEvent): void {
        if (!event.threadParentId) return

        let streamThreads = this.state.threads.get(streamId)
        if (!streamThreads) {
            streamThreads = new Map()
            this.state.threads.set(streamId, streamThreads)
        }

        let threadTimeline = streamThreads.get(event.threadParentId)
        if (!threadTimeline) {
            threadTimeline = []
            streamThreads.set(event.threadParentId, threadTimeline)
        }

        let streamThreadIndex = this.state.threadEventIndex.get(streamId)
        if (!streamThreadIndex) {
            streamThreadIndex = new Map()
            this.state.threadEventIndex.set(streamId, streamThreadIndex)
        }

        let threadIndex = streamThreadIndex.get(event.threadParentId)
        if (!threadIndex) {
            threadIndex = new Map()
            streamThreadIndex.set(event.threadParentId, threadIndex)
        }

        // Binary insertion for sorted order
        const insertIdx = this.binaryFindInsertIndex(threadTimeline, event.eventNum)
        threadTimeline.splice(insertIdx, 0, event)

        // Update indices
        for (const [eventId, idx] of threadIndex) {
            if (idx >= insertIdx) {
                threadIndex.set(eventId, idx + 1)
            }
        }
        threadIndex.set(event.eventId, insertIdx)
    }

    private removeThreadEventInternal(streamId: string, event: TimelineEvent): void {
        if (!event.threadParentId) return

        const threadTimeline = this.state.threads.get(streamId)?.get(event.threadParentId)
        const threadIndex = this.state.threadEventIndex
            .get(streamId)
            ?.get(event.threadParentId)

        if (!threadTimeline || !threadIndex) return

        const index = threadIndex.get(event.eventId)
        if (index === undefined) return

        // Mutable remove
        threadTimeline.splice(index, 1)
        threadIndex.delete(event.eventId)

        // Update indices
        for (const [eventId, idx] of threadIndex) {
            if (idx > index) {
                threadIndex.set(eventId, idx - 1)
            }
        }
    }

    private updateThreadEvent(
        streamId: string,
        parentId: string,
        oldEvent: TimelineEvent,
        newEvent: TimelineEvent,
    ): void {
        const threadTimeline = this.state.threads.get(streamId)?.get(parentId)
        const threadIndex = this.state.threadEventIndex.get(streamId)?.get(parentId)

        if (!threadTimeline || !threadIndex) {
            // Thread doesn't exist, insert the new event
            this.insertThreadEventInternal(streamId, newEvent)
            return
        }

        const index = threadIndex.get(oldEvent.eventId)
        if (index === undefined) {
            // Event not in thread, insert it
            this.insertThreadEventInternal(streamId, newEvent)
            return
        }

        // Mutable update
        threadTimeline[index] = newEvent

        // Update index if eventId changed
        if (oldEvent.eventId !== newEvent.eventId) {
            threadIndex.delete(oldEvent.eventId)
            threadIndex.set(newEvent.eventId, index)
        }
    }

    // ============================================================================
    // Private - Thread Stats (Mutable)
    // ============================================================================

    private addThreadStatsInternal(
        streamId: string,
        event: TimelineEvent,
        userId: string,
    ): void {
        const parentId = event.threadParentId
        if (!parentId) {
            // Check if this event is itself a parent
            this.maybeUpdateParentStats(streamId, event, userId)
            return
        }

        let streamStats = this.state.threadsStats.get(streamId)
        if (!streamStats) {
            streamStats = new Map()
            this.state.threadsStats.set(streamId, streamStats)
        }

        let stats = streamStats.get(parentId)
        if (!stats) {
            // Find parent event for stats
            const parentIndex = this.state.eventIndex.get(streamId)?.get(parentId)
            const parentEvent = parentIndex !== undefined
                ? this.state.timelines.get(streamId)?.[parentIndex]
                : undefined

            stats = {
                replyEventIds: new Set<string>(),
                userIds: new Set<string>(),
                latestTs: event.createdAtEpochMs,
                parentId,
                parentEvent,
                parentMessageContent: this.getChannelMessageContent(parentEvent),
                isParticipating: false,
            }
            streamStats.set(parentId, stats)
        }

        if (event.content?.kind === RiverTimelineEvent.RedactedEvent) {
            return
        }

        // Mutable update
        stats.replyEventIds.add(event.eventId)
        stats.latestTs = Math.max(stats.latestTs, event.createdAtEpochMs)

        const senderId = this.getMessageSenderId(event)
        if (senderId) {
            stats.userIds.add(senderId)
        }

        stats.isParticipating =
            stats.isParticipating ||
            stats.userIds.has(userId) ||
            stats.parentEvent?.sender.id === userId ||
            event.isMentioned
    }

    private maybeUpdateParentStats(
        streamId: string,
        event: TimelineEvent,
        userId: string,
    ): void {
        const stats = this.state.threadsStats.get(streamId)?.get(event.eventId)
        if (stats) {
            // Update parent event reference
            stats.parentEvent = event
            stats.parentMessageContent = this.getChannelMessageContent(event)
            stats.isParticipating =
                stats.isParticipating ||
                (event.content?.kind !== RiverTimelineEvent.RedactedEvent &&
                    stats.replyEventIds.size > 0 &&
                    (event.sender.id === userId || event.isMentioned))
        }
    }

    private removeThreadStatsInternal(streamId: string, event: TimelineEvent): void {
        const parentId = event.threadParentId
        if (!parentId) return

        const stats = this.state.threadsStats.get(streamId)?.get(parentId)
        if (!stats) return

        stats.replyEventIds.delete(event.eventId)
        if (stats.replyEventIds.size === 0) {
            this.state.threadsStats.get(streamId)?.delete(parentId)
        } else {
            const senderId = this.getMessageSenderId(event)
            if (senderId) {
                stats.userIds.delete(senderId)
            }
        }
    }

    // ============================================================================
    // Private - Reactions (Mutable)
    // ============================================================================

    private addReactionsInternal(streamId: string, event: TimelineEvent): void {
        const parentId = event.reactionParentId
        if (!parentId) return

        const content =
            event.content?.kind === RiverTimelineEvent.Reaction ? event.content : undefined
        if (!content) return

        let streamReactions = this.state.reactions.get(streamId)
        if (!streamReactions) {
            streamReactions = new Map()
            this.state.reactions.set(streamId, streamReactions)
        }

        let reactions = streamReactions.get(parentId)
        if (!reactions) {
            reactions = {}
            streamReactions.set(parentId, reactions)
        }

        // Mutable update
        if (!reactions[content.reaction]) {
            reactions[content.reaction] = {}
        }
        reactions[content.reaction][event.sender.id] = { eventId: event.eventId }
    }

    private removeReactionsInternal(streamId: string, event: TimelineEvent): void {
        const parentId = event.reactionParentId
        if (!parentId) return

        const content =
            event.content?.kind === RiverTimelineEvent.Reaction ? event.content : undefined
        if (!content) return

        const reactions = this.state.reactions.get(streamId)?.get(parentId)
        if (!reactions) return

        const reactionGroup = reactions[content.reaction]
        if (reactionGroup) {
            delete reactionGroup[event.sender.id]
            if (Object.keys(reactionGroup).length === 0) {
                delete reactions[content.reaction]
            }
        }
    }

    // ============================================================================
    // Private - Tips (Mutable)
    // ============================================================================

    private addTipsInternal(
        streamId: string,
        event: TimelineEvent,
        direction: 'append' | 'prepend',
    ): void {
        if (!isMessageTipEvent(event)) return

        let streamTips = this.state.tips.get(streamId)
        if (!streamTips) {
            streamTips = new Map()
            this.state.tips.set(streamId, streamTips)
        }

        const refEventId = (event as MessageTipEvent).content.refEventId
        let tips = streamTips.get(refEventId)
        if (!tips) {
            tips = []
            streamTips.set(refEventId, tips)
        }

        // Mutable update
        if (direction === 'append') {
            tips.push(event as MessageTipEvent)
        } else {
            tips.unshift(event as MessageTipEvent)
        }
    }

    private removeTipsInternal(streamId: string, event: TimelineEvent): void {
        if (!isMessageTipEvent(event)) return

        const refEventId = (event as MessageTipEvent).content.refEventId
        const tips = this.state.tips.get(streamId)?.get(refEventId)
        if (!tips) return

        const index = tips.findIndex((t) => t.eventId === event.eventId)
        if (index !== -1) {
            tips.splice(index, 1)
        }
    }

    // ============================================================================
    // Private - Edit Tracking (Phase 3)
    // ============================================================================

    private trackOriginalEvent(streamId: string, event: TimelineEvent): void {
        let streamOriginals = this.state.originalEvents.get(streamId)
        if (!streamOriginals) {
            streamOriginals = new Map()
            this.state.originalEvents.set(streamId, streamOriginals)
        }

        // Only store if we don't already have an original for this eventId
        if (!streamOriginals.has(event.eventId)) {
            streamOriginals.set(event.eventId, event)
        }

        // Track in replacement log
        let log = this.state.replacementLog.get(streamId)
        if (!log) {
            log = []
            this.state.replacementLog.set(streamId, log)
        }
        log.push(event.eventId)
    }

    private addPendingReplacement(
        streamId: string,
        replacedMsgId: string,
        event: TimelineEvent,
    ): void {
        let streamPending = this.state.pendingReplacedEvents.get(streamId)
        if (!streamPending) {
            streamPending = new Map()
            this.state.pendingReplacedEvents.set(streamId, streamPending)
        }

        const existing = streamPending.get(replacedMsgId)
        if (!existing || existing.latestEventNum <= event.latestEventNum) {
            streamPending.set(replacedMsgId, event)
        }
    }

    // ============================================================================
    // Private - Helpers
    // ============================================================================

    private binaryFindInsertIndex(events: TimelineEvent[], eventNum: bigint): number {
        let low = 0
        let high = events.length

        while (low < high) {
            const mid = (low + high) >>> 1
            if (events[mid].eventNum < eventNum) {
                low = mid + 1
            } else {
                high = mid
            }
        }

        return low
    }

    private toReplacedMessageEvent(
        prev: TimelineEvent,
        next: TimelineEvent,
    ): TimelineEvent {
        // Check if replacement is allowed
        if (
            next.content?.kind === RiverTimelineEvent.RedactedEvent &&
            next.content.isAdminRedaction
        ) {
            // Admin redaction always allowed
        } else if (next.sender.id !== prev.sender.id) {
            logger.info('cannot replace event', { prev, next })
            return prev
        }

        const isLocalId = prev.eventId.startsWith('~')

        if (
            next.content?.kind === RiverTimelineEvent.ChannelMessage &&
            prev.content?.kind === RiverTimelineEvent.ChannelMessage
        ) {
            const eventId = !isLocalId ? prev.eventId : next.eventId
            return {
                ...next,
                eventId,
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
            return {
                ...prev,
                latestEventId: next.eventId,
                latestEventNum: next.eventNum,
                confirmedEventNum: prev.confirmedEventNum ?? next.confirmedEventNum,
                confirmedInBlockNum: prev.confirmedInBlockNum ?? next.confirmedInBlockNum,
                confirmedAtEpochMs: next.confirmedAtEpochMs,
            }
        } else {
            const eventId = isLocalId ? next.eventId : prev.eventId
            return {
                ...next,
                eventId,
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

    private makeRedactionEvent(redactionAction: TimelineEvent): TimelineEvent {
        if (redactionAction.content?.kind !== RiverTimelineEvent.RedactionActionEvent) {
            throw new Error('makeRedactionEvent called with non-redaction action event')
        }

        const newContent = {
            kind: RiverTimelineEvent.RedactedEvent as const,
            isAdminRedaction: redactionAction.content.adminRedaction,
        }

        return {
            ...redactionAction,
            content: newContent,
            fallbackContent: `${RiverTimelineEvent.RedactedEvent} ~Redacted~`,
            isRedacted: true,
        }
    }

    private getChannelMessageContent(event?: TimelineEvent) {
        return event?.content?.kind === RiverTimelineEvent.ChannelMessage
            ? event.content
            : undefined
    }

    private getMessageSenderId(event: TimelineEvent): string | undefined {
        if (
            event.content?.kind === RiverTimelineEvent.ChannelMessage ||
            event.content?.kind === RiverTimelineEvent.TokenTransfer
        ) {
            return event.sender.id
        }
        return undefined
    }

    private filterFn(streamId: string, event: TimelineEvent): boolean {
        if (
            isDMChannelStreamId(streamId) &&
            this.delegate?.isDMMessageEventBlocked(event) === true
        ) {
            return false
        }
        return (
            !this.eventFilter ||
            !event.content?.kind ||
            !this.eventFilter.has(event.content.kind)
        )
    }

    // ============================================================================
    // Private - Change Notification
    // ============================================================================

    private invalidateAndNotify(): void {
        this.stateVersion++
        this.notifyChange()
    }

    private notifyChange(): void {
        this.stateVersion++
        // Materialize and notify
        const newValue = this.materializeView()
        this.cachedValue = newValue
        this.cachedVersion = this.stateVersion

        // Use parent class setValue to trigger notifications
        this._value = newValue
        // Notify subscribers
        ;(this as any).notify(this._value)
    }

    /**
     * Materialize immutable view from mutable state
     * This is the key to maintaining backwards compatibility
     */
    private materializeView(): TimelinesViewModel {
        // Convert Maps to Records
        const timelines: TimelinesMap = {}
        for (const [streamId, events] of this.state.timelines) {
            timelines[streamId] = events
        }

        const eventIndex: EventIndexMap = {}
        for (const [streamId, index] of this.state.eventIndex) {
            eventIndex[streamId] = index
        }

        const threads: ThreadsMap = {}
        for (const [streamId, streamThreads] of this.state.threads) {
            threads[streamId] = {}
            for (const [parentId, events] of streamThreads) {
                threads[streamId][parentId] = events
            }
        }

        const threadEventIndex: ThreadEventIndexMap = {}
        for (const [streamId, streamIndex] of this.state.threadEventIndex) {
            threadEventIndex[streamId] = {}
            for (const [parentId, index] of streamIndex) {
                threadEventIndex[streamId][parentId] = index
            }
        }

        const threadsStats: ThreadStatsMap = {}
        for (const [streamId, streamStats] of this.state.threadsStats) {
            threadsStats[streamId] = {}
            for (const [parentId, stats] of streamStats) {
                threadsStats[streamId][parentId] = stats
            }
        }

        const reactions: ReactionsMap = {}
        for (const [streamId, streamReactions] of this.state.reactions) {
            reactions[streamId] = {}
            for (const [parentId, r] of streamReactions) {
                reactions[streamId][parentId] = r
            }
        }

        const tips: TipsMap = {}
        for (const [streamId, streamTips] of this.state.tips) {
            tips[streamId] = {}
            for (const [parentId, t] of streamTips) {
                tips[streamId][parentId] = t
            }
        }

        const originalEvents: OriginalEventsMap = {}
        for (const [streamId, events] of this.state.originalEvents) {
            originalEvents[streamId] = {}
            for (const [eventId, event] of events) {
                originalEvents[streamId][eventId] = event
            }
        }

        const replacementLog: ReplacementLogMap = {}
        for (const [streamId, log] of this.state.replacementLog) {
            replacementLog[streamId] = log
        }

        const pendingReplacedEvents: Record<string, Record<string, TimelineEvent>> = {}
        for (const [streamId, pending] of this.state.pendingReplacedEvents) {
            pendingReplacedEvents[streamId] = {}
            for (const [eventId, event] of pending) {
                pendingReplacedEvents[streamId][eventId] = event
            }
        }

        const lastestEventByUser: { [userId: string]: TimelineEvent } = {}
        for (const [userId, event] of this.state.latestEventByUser) {
            lastestEventByUser[userId] = event
        }

        return {
            timelines,
            eventIndex,
            originalEvents,
            replacementLog,
            pendingReplacedEvents,
            threadsStats,
            threads,
            threadEventIndex,
            reactions,
            tips,
            lastestEventByUser,
        }
    }
}

// Re-export types that consumers need
export { getEditsId, getRedactsId } from '../models/timelineTypes'
