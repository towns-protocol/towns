/**
 * MutableTimelinesView - Optimized timelines view using EventStore
 *
 * Key optimizations over the original TimelinesView:
 * 1. Normalized event storage via EventStore (single copy per event)
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
import { EventStore } from './eventStore'
import { dlogger } from '@towns-protocol/utils'

const logger = dlogger('csb:mutableTimelinesView')

export interface TimelinesViewDelegate {
    isDMMessageEventBlocked(event: TimelineEvent): boolean
}

/**
 * MutableTimelinesView - Drop-in replacement for TimelinesView with optimizations
 *
 * Uses EventStore for normalized raw event storage with lazy transformation.
 * The external `value` getter materializes the immutable view on demand.
 */
export class MutableTimelinesView extends Observable<TimelinesViewModel> {
    readonly streamIds = new Set<string>()

    // EventStore for normalized raw event storage
    private eventStore: EventStore

    // Auxiliary mutable state (not stored in EventStore)
    private threadsStats = new Map<string, Map<string, ThreadStatsData>>()
    private reactions = new Map<string, Map<string, MessageReactions>>()
    private tips = new Map<string, Map<string, MessageTips>>()
    private originalEvents = new Map<string, Map<string, TimelineEvent>>()
    private replacementLog = new Map<string, string[]>()
    private pendingReplacedEvents = new Map<string, Map<string, TimelineEvent>>()
    private latestEventByUser = new Map<string, TimelineEvent>()

    // Version for cache invalidation
    private stateVersion = 0
    private cachedValue: TimelinesViewModel | null = null
    private cachedVersion = -1

    // Batching infrastructure
    private batchDepth = 0
    private hasPendingChanges = false

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

        // Create EventStore for normalized storage
        this.eventStore = new EventStore(userId)
    }

    /**
     * Override value getter for lazy materialization
     */
    override get value(): TimelinesViewModel {
        // Return cached value if still valid
        if (this.cachedValue && this.cachedVersion === this.stateVersion) {
            return this.cachedValue
        }

        // Materialize immutable view from EventStore
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
    // Public API - EventStore Delegation
    // ============================================================================

    /**
     * Get raw StreamTimelineEvent by ID (delegates to EventStore)
     */
    getRawEvent(eventId: string): StreamTimelineEvent | undefined {
        return this.eventStore.getRawEvent(eventId)
    }

    /**
     * Get all unconfirmed events for a stream
     */
    getUnconfirmedEvents(streamId: string): StreamTimelineEvent[] {
        return this.eventStore.getUnconfirmedEvents(streamId)
    }

    /**
     * Get all local events for a stream (sorted by eventNum)
     */
    getLocalEvents(streamId: string): LocalTimelineEvent[] {
        return this.eventStore.getLocalEvents(streamId)
    }

    /**
     * Find an event by its local event ID
     */
    findEventByLocalId(streamId: string, localId: string): StreamTimelineEvent | undefined {
        return this.eventStore.findByLocalEventId(streamId, localId)
    }

    /**
     * Check if an event exists in the store
     */
    hasEvent(eventId: string): boolean {
        return this.eventStore.hasEvent(eventId)
    }

    // ============================================================================
    // Public API - Batching
    // ============================================================================

    /**
     * Begin a batch operation. Notifications are deferred until endBatch() is called.
     * Batches can be nested; notifications fire when outermost batch ends.
     */
    beginBatch(): void {
        this.batchDepth++
    }

    /**
     * End a batch operation. If this is the outermost batch and changes occurred,
     * fires a single notification.
     */
    endBatch(): void {
        if (this.batchDepth > 0) {
            this.batchDepth--
            if (this.batchDepth === 0 && this.hasPendingChanges) {
                this.hasPendingChanges = false
                this.doNotify()
            }
        }
    }

    /**
     * Execute a function within a batch. Notifications are deferred until the
     * function completes, then a single notification is fired.
     */
    batch<T>(fn: () => T): T {
        this.beginBatch()
        try {
            return fn()
        } finally {
            this.endBatch()
        }
    }

    // ============================================================================
    // Public API - Stream Lifecycle
    // ============================================================================

    streamInitialized(streamId: string, messages: StreamTimelineEvent[]) {
        this.streamIds.add(streamId)
        this.initializeStream(this.userId, streamId)

        // Filter and store raw events in EventStore
        for (const rawEvent of messages) {
            const transformed = toEvent(rawEvent, this.userId)
            if (this.filterFn(streamId, transformed)) {
                this.processRawEvent(streamId, rawEvent, transformed, undefined)
            }
        }
        this.notifyChange()
    }

    streamUpdated(streamId: string, change: StreamChange) {
        const { prepended, appended, updated, confirmed } = change
        this.streamIds.add(streamId)

        if (prepended) {
            for (const rawEvent of [...prepended].reverse()) {
                const transformed = toEvent(rawEvent, this.userId)
                if (this.filterFn(streamId, transformed)) {
                    this.processRawEventPrepend(streamId, rawEvent, transformed)
                }
            }
        }

        if (appended) {
            for (const rawEvent of appended) {
                const transformed = toEvent(rawEvent, this.userId)
                if (this.filterFn(streamId, transformed)) {
                    this.processRawEvent(streamId, rawEvent, transformed, undefined)
                }
            }
        }

        if (updated) {
            for (const rawEvent of updated) {
                const transformed = toEvent(rawEvent, this.userId)
                if (this.filterFn(streamId, transformed)) {
                    this.processRawEvent(streamId, rawEvent, transformed, transformed.eventId)
                }
            }
        }

        if (confirmed) {
            this.confirmEventsInternal(
                confirmed.map((event) => ({
                    eventId: event.hashStr,
                    confirmedInBlockNum: event.miniblockNum,
                    confirmedEventNum: event.confirmedEventNum,
                    confirmedAtEpochMs: event.confirmedAtEpochMs,
                })),
                streamId,
            )
        }

        this.notifyChange()
    }

    streamEventDecrypted(
        streamId: string,
        eventId: string,
        decryptedContent: DecryptedContent,
    ): TimelineEvent | undefined {
        const normalized = this.eventStore.getEvent(eventId)
        if (!normalized) return undefined

        // Update raw event with decrypted content
        const updatedRaw: StreamTimelineEvent = {
            ...normalized.rawEvent,
            decryptedContent,
        }
        this.eventStore.updateEvent(eventId, updatedRaw)
        this.invalidateAndNotify()

        return this.eventStore.getTimelineEvent(eventId)
    }

    streamEventDecryptedContentError(
        streamId: string,
        eventId: string,
        error: DecryptionSessionError,
    ) {
        const normalized = this.eventStore.getEvent(eventId)
        if (!normalized) return

        // Update raw event with error
        const updatedRaw: StreamTimelineEvent = {
            ...normalized.rawEvent,
            decryptedContentError: error,
        }
        this.eventStore.updateEvent(eventId, updatedRaw)
        this.invalidateAndNotify()
    }

    streamLocalEventUpdated(
        streamId: string,
        localEventId: string,
        localEvent: LocalTimelineEvent,
    ) {
        this.streamIds.add(streamId)
        const transformed = toEvent(localEvent, this.userId)
        if (this.filterFn(streamId, transformed)) {
            this.processRawEvent(streamId, localEvent, transformed, localEventId)
            this.notifyChange()
        }
    }

    // ============================================================================
    // Private - Event Processing with EventStore
    // ============================================================================

    private processRawEvent(
        streamId: string,
        rawEvent: StreamTimelineEvent,
        transformed: TimelineEvent,
        updatingEventId?: string,
    ): void {
        const editsEventId = getEditsId(transformed.content)
        const redactsEventId = getRedactsId(transformed.content)

        if (redactsEventId) {
            // Handle redaction
            const redactedEvent = this.makeRedactionEvent(transformed)
            this.replaceEventByEventId(streamId, redactsEventId, redactedEvent, rawEvent)
            if (updatingEventId) {
                this.replaceEventByEventId(streamId, updatingEventId, transformed, rawEvent)
            } else {
                this.addRawEvent(streamId, rawEvent, transformed)
            }
        } else if (editsEventId) {
            // Handle edit
            if (updatingEventId) {
                this.eventStore.removeEvent(updatingEventId)
            }
            this.replaceEventByEventId(streamId, editsEventId, transformed, rawEvent)
        } else {
            // Normal append or update
            if (updatingEventId) {
                this.replaceEventByEventId(streamId, updatingEventId, transformed, rawEvent)
            } else {
                this.addRawEvent(streamId, rawEvent, transformed)
            }
        }

        // Update latest event by user
        const prevLatestEvent = this.latestEventByUser.get(transformed.sender.id)
        if ((prevLatestEvent?.createdAtEpochMs ?? 0) < transformed.createdAtEpochMs) {
            this.latestEventByUser.set(transformed.sender.id, transformed)
        }
    }

    private processRawEventPrepend(
        streamId: string,
        rawEvent: StreamTimelineEvent,
        transformed: TimelineEvent,
    ): void {
        const editsEventId = getEditsId(transformed.content)
        const redactsEventId = getRedactsId(transformed.content)

        if (redactsEventId) {
            const redactedEvent = this.makeRedactionEvent(transformed)
            this.prependRawEvent(streamId, rawEvent, transformed)
            this.replaceEventByEventId(streamId, redactsEventId, redactedEvent, rawEvent)
        } else if (editsEventId) {
            this.replaceEventByEventId(streamId, editsEventId, transformed, rawEvent)
        } else {
            this.prependRawEvent(streamId, rawEvent, transformed)
        }
    }

    private addRawEvent(
        streamId: string,
        rawEvent: StreamTimelineEvent,
        transformed: TimelineEvent,
    ): void {
        // Check if this event should replace a local event (by localEventId)
        if (transformed.localEventId) {
            const eventIds = this.eventStore.getStreamEventIds(streamId)
            for (const existingId of eventIds) {
                // Skip if same ID (already exists check handled by EventStore)
                if (existingId === transformed.eventId) continue

                const existing = this.eventStore.getTimelineEvent(existingId)
                if (existing?.localEventId === transformed.localEventId) {
                    // Found local event with same localEventId - replace it
                    this.doReplace(
                        streamId,
                        existingId,
                        this.eventStore.getEvent(existingId)!.rawEvent,
                        transformed,
                        rawEvent,
                    )
                    return
                }
            }
        }

        // No local match found, add as new event
        this.eventStore.addEvent(
            streamId,
            rawEvent,
            transformed.threadParentId,
            transformed.replyParentId,
            transformed.reactionParentId,
        )

        // Update auxiliary data
        this.addThreadStats(streamId, transformed)
        this.addReactions(streamId, transformed)
        this.addTips(streamId, transformed, 'append')
    }

    private prependRawEvent(
        streamId: string,
        rawEvent: StreamTimelineEvent,
        transformed: TimelineEvent,
    ): void {
        // Check for pending replacement
        const pendingReplacement = this.pendingReplacedEvents
            .get(streamId)
            ?.get(transformed.eventId)

        if (pendingReplacement) {
            // Apply pending replacement to raw event
            const mergedTransformed = this.toReplacedMessageEvent(transformed, pendingReplacement)
            this.eventStore.prependEvent(
                streamId,
                rawEvent,
                mergedTransformed.threadParentId,
                mergedTransformed.replyParentId,
                mergedTransformed.reactionParentId,
            )
            this.addThreadStats(streamId, mergedTransformed)
            this.addReactions(streamId, mergedTransformed)
            this.addTips(streamId, mergedTransformed, 'prepend')
        } else {
            this.eventStore.prependEvent(
                streamId,
                rawEvent,
                transformed.threadParentId,
                transformed.replyParentId,
                transformed.reactionParentId,
            )
            this.addThreadStats(streamId, transformed)
            this.addReactions(streamId, transformed)
            this.addTips(streamId, transformed, 'prepend')
        }
    }

    private replaceEventByEventId(
        streamId: string,
        replacedEventId: string,
        newTransformed: TimelineEvent,
        newRawEvent: StreamTimelineEvent,
    ): void {
        const existingNormalized = this.eventStore.getEvent(replacedEventId)

        if (!existingNormalized) {
            // Try local event ID fallback
            const eventIds = this.eventStore.getStreamEventIds(streamId)
            let foundId: string | undefined
            for (const eventId of eventIds) {
                const event = this.eventStore.getTimelineEvent(eventId)
                if (event?.localEventId && event.localEventId === newTransformed.localEventId) {
                    foundId = eventId
                    break
                }
            }

            if (!foundId) {
                // Store as pending
                this.addPendingReplacement(streamId, replacedEventId, newTransformed)
                return
            }

            // Found by local ID, continue with replacement
            const foundNormalized = this.eventStore.getEvent(foundId)
            if (!foundNormalized) {
                this.addPendingReplacement(streamId, replacedEventId, newTransformed)
                return
            }

            this.doReplace(streamId, foundId, foundNormalized.rawEvent, newTransformed, newRawEvent)
            return
        }

        this.doReplace(streamId, replacedEventId, existingNormalized.rawEvent, newTransformed, newRawEvent)
    }

    private doReplace(
        streamId: string,
        oldEventId: string,
        oldRawEvent: StreamTimelineEvent,
        newTransformed: TimelineEvent,
        newRawEvent: StreamTimelineEvent,
    ): void {
        const oldTransformed = toEvent(oldRawEvent, this.userId)

        if (newTransformed.latestEventNum < oldTransformed.latestEventNum) {
            return
        }

        const mergedTransformed = this.toReplacedMessageEvent(oldTransformed, newTransformed)

        // Track original event (Phase 3 optimization)
        this.trackOriginalEvent(streamId, oldTransformed)

        // Create merged raw event
        const mergedRaw: StreamTimelineEvent = {
            ...newRawEvent,
            hashStr: mergedTransformed.eventId,
            eventNum: mergedTransformed.eventNum,
            confirmedEventNum: mergedTransformed.confirmedEventNum,
            miniblockNum: mergedTransformed.confirmedInBlockNum,
            confirmedAtEpochMs: mergedTransformed.confirmedAtEpochMs,
        }

        // Update in EventStore - use re-keying if ID changed (local -> server transition)
        const newEventId = mergedTransformed.eventId
        if (oldEventId !== newEventId) {
            this.eventStore.updateEventWithNewId(oldEventId, newEventId, mergedRaw)
        } else {
            this.eventStore.updateEvent(oldEventId, mergedRaw)
        }

        // Update auxiliary data
        this.removeThreadStats(streamId, oldTransformed)
        this.addThreadStats(streamId, mergedTransformed)
        this.removeReactions(streamId, oldTransformed)
        this.addReactions(streamId, mergedTransformed)
        this.removeTips(streamId, oldTransformed)
        this.addTips(streamId, mergedTransformed, 'append')
    }

    // ============================================================================
    // Private - State Interface Methods (for backwards compatibility)
    // ============================================================================

    private initializeStream(userId: string, streamId: string): void {
        this.eventStore.initializeStream(streamId)
        this.threadsStats.set(streamId, new Map())
        this.reactions.set(streamId, new Map())
        this.tips.set(streamId, new Map())
    }

    private reset(streamIds: string[]): void {
        this.eventStore.clearStreams(streamIds)
        for (const streamId of streamIds) {
            this.threadsStats.delete(streamId)
            this.reactions.delete(streamId)
            this.tips.delete(streamId)
            this.originalEvents.delete(streamId)
            this.replacementLog.delete(streamId)
            this.pendingReplacedEvents.delete(streamId)
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
        for (const event of events) {
            // Create a minimal raw event from transformed (for backwards compat)
            const rawEvent = this.transformedToRaw(event)
            this.processRawEvent(streamId, rawEvent, event, undefined)
        }
        this.notifyChange()
    }

    private prependEvents(events: TimelineEvent[], userId: string, streamId: string): void {
        for (const event of [...events].reverse()) {
            const rawEvent = this.transformedToRaw(event)
            this.processRawEventPrepend(streamId, rawEvent, event)
        }
        this.notifyChange()
    }

    private updateEvents(events: TimelineEvent[], userId: string, streamId: string): void {
        for (const event of events) {
            const rawEvent = this.transformedToRaw(event)
            this.processRawEvent(streamId, rawEvent, event, event.eventId)
        }
        this.notifyChange()
    }

    private updateEvent(
        event: TimelineEvent,
        userId: string,
        streamId: string,
        replacingEventId: string,
    ): void {
        const rawEvent = this.transformedToRaw(event)
        this.processRawEvent(streamId, rawEvent, event, replacingEventId)
        this.notifyChange()
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
        for (const confirmation of confirmations) {
            const normalized = this.eventStore.getEvent(confirmation.eventId)
            if (!normalized) continue

            const updatedRaw: StreamTimelineEvent = {
                ...normalized.rawEvent,
                confirmedEventNum: confirmation.confirmedEventNum,
                miniblockNum: confirmation.confirmedInBlockNum,
                confirmedAtEpochMs: confirmation.confirmedAtEpochMs,
            }
            this.eventStore.updateEvent(confirmation.eventId, updatedRaw)
        }
    }

    // ============================================================================
    // Private - Thread Stats (Mutable)
    // ============================================================================

    private addThreadStats(streamId: string, event: TimelineEvent): void {
        const parentId = event.threadParentId
        if (!parentId) {
            this.maybeUpdateParentStats(streamId, event)
            return
        }

        let streamStats = this.threadsStats.get(streamId)
        if (!streamStats) {
            streamStats = new Map()
            this.threadsStats.set(streamId, streamStats)
        }

        let stats = streamStats.get(parentId)
        if (!stats) {
            const parentEvent = this.eventStore.getTimelineEvent(parentId)
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

        stats.replyEventIds.add(event.eventId)
        stats.latestTs = Math.max(stats.latestTs, event.createdAtEpochMs)

        const senderId = this.getMessageSenderId(event)
        if (senderId) {
            stats.userIds.add(senderId)
        }

        stats.isParticipating =
            stats.isParticipating ||
            stats.userIds.has(this.userId) ||
            stats.parentEvent?.sender.id === this.userId ||
            event.isMentioned
    }

    private maybeUpdateParentStats(streamId: string, event: TimelineEvent): void {
        const stats = this.threadsStats.get(streamId)?.get(event.eventId)
        if (stats) {
            stats.parentEvent = event
            stats.parentMessageContent = this.getChannelMessageContent(event)
            stats.isParticipating =
                stats.isParticipating ||
                (event.content?.kind !== RiverTimelineEvent.RedactedEvent &&
                    stats.replyEventIds.size > 0 &&
                    (event.sender.id === this.userId || event.isMentioned))
        }
    }

    private removeThreadStats(streamId: string, event: TimelineEvent): void {
        const parentId = event.threadParentId
        if (!parentId) return

        const stats = this.threadsStats.get(streamId)?.get(parentId)
        if (!stats) return

        stats.replyEventIds.delete(event.eventId)
        if (stats.replyEventIds.size === 0) {
            this.threadsStats.get(streamId)?.delete(parentId)
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

    private addReactions(streamId: string, event: TimelineEvent): void {
        const parentId = event.reactionParentId
        if (!parentId) return

        const content =
            event.content?.kind === RiverTimelineEvent.Reaction ? event.content : undefined
        if (!content) return

        let streamReactions = this.reactions.get(streamId)
        if (!streamReactions) {
            streamReactions = new Map()
            this.reactions.set(streamId, streamReactions)
        }

        let reactions = streamReactions.get(parentId)
        if (!reactions) {
            reactions = {}
            streamReactions.set(parentId, reactions)
        }

        if (!reactions[content.reaction]) {
            reactions[content.reaction] = {}
        }
        reactions[content.reaction][event.sender.id] = { eventId: event.eventId }
    }

    private removeReactions(streamId: string, event: TimelineEvent): void {
        const parentId = event.reactionParentId
        if (!parentId) return

        const content =
            event.content?.kind === RiverTimelineEvent.Reaction ? event.content : undefined
        if (!content) return

        const reactions = this.reactions.get(streamId)?.get(parentId)
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

    private addTips(
        streamId: string,
        event: TimelineEvent,
        direction: 'append' | 'prepend',
    ): void {
        if (!isMessageTipEvent(event)) return

        let streamTips = this.tips.get(streamId)
        if (!streamTips) {
            streamTips = new Map()
            this.tips.set(streamId, streamTips)
        }

        const refEventId = (event as MessageTipEvent).content.refEventId
        let tips = streamTips.get(refEventId)
        if (!tips) {
            tips = []
            streamTips.set(refEventId, tips)
        }

        if (direction === 'append') {
            tips.push(event as MessageTipEvent)
        } else {
            tips.unshift(event as MessageTipEvent)
        }
    }

    private removeTips(streamId: string, event: TimelineEvent): void {
        if (!isMessageTipEvent(event)) return

        const refEventId = (event as MessageTipEvent).content.refEventId
        const tips = this.tips.get(streamId)?.get(refEventId)
        if (!tips) return

        const index = tips.findIndex((t) => t.eventId === event.eventId)
        if (index !== -1) {
            tips.splice(index, 1)
        }
    }

    // ============================================================================
    // Private - Edit Tracking
    // ============================================================================

    private trackOriginalEvent(streamId: string, event: TimelineEvent): void {
        let streamOriginals = this.originalEvents.get(streamId)
        if (!streamOriginals) {
            streamOriginals = new Map()
            this.originalEvents.set(streamId, streamOriginals)
        }

        if (!streamOriginals.has(event.eventId)) {
            streamOriginals.set(event.eventId, event)
        }

        let log = this.replacementLog.get(streamId)
        if (!log) {
            log = []
            this.replacementLog.set(streamId, log)
        }
        log.push(event.eventId)
    }

    private addPendingReplacement(
        streamId: string,
        replacedMsgId: string,
        event: TimelineEvent,
    ): void {
        let streamPending = this.pendingReplacedEvents.get(streamId)
        if (!streamPending) {
            streamPending = new Map()
            this.pendingReplacedEvents.set(streamId, streamPending)
        }

        const existing = streamPending.get(replacedMsgId)
        if (!existing || existing.latestEventNum <= event.latestEventNum) {
            streamPending.set(replacedMsgId, event)
        }
    }

    // ============================================================================
    // Private - Helpers
    // ============================================================================

    private transformedToRaw(event: TimelineEvent): StreamTimelineEvent {
        // Create a minimal raw event from transformed (for setState backwards compat)
        return {
            hashStr: event.eventId,
            creatorUserId: event.sender.id,
            eventNum: event.eventNum,
            createdAtEpochMs: BigInt(event.createdAtEpochMs),
            confirmedEventNum: event.confirmedEventNum,
            miniblockNum: event.confirmedInBlockNum,
            confirmedAtEpochMs: event.confirmedAtEpochMs,
        }
    }

    private toReplacedMessageEvent(
        prev: TimelineEvent,
        next: TimelineEvent,
    ): TimelineEvent {
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
        // notifyChange() already bumps stateVersion, don't double-bump
        this.notifyChange()
    }

    private notifyChange(): void {
        // If batching is active, defer the notification
        if (this.batchDepth > 0) {
            this.hasPendingChanges = true
            this.cachedVersion = -1 // Invalidate cache
            return
        }
        this.doNotify()
    }

    /**
     * Actually perform the notification (called directly or after batch ends)
     */
    private doNotify(): void {
        this.stateVersion++

        // Skip notification if no subscribers (lazy optimization)
        if (this.subscribers.length === 0) {
            this.cachedVersion = -1 // Just invalidate cache
            return
        }

        // Materialize and notify synchronously for compatibility
        const prevValue = this._value
        const newValue = this.materializeView()
        this.cachedValue = newValue
        this.cachedVersion = this.stateVersion
        this._value = newValue
        ;(this as any).notify(prevValue)
    }

    /**
     * Materialize immutable view from EventStore and auxiliary state
     */
    private materializeView(): TimelinesViewModel {
        const timelines: TimelinesMap = {}
        const eventIndex: EventIndexMap = {}
        const threads: ThreadsMap = {}
        const threadEventIndex: ThreadEventIndexMap = {}

        // Get all stream IDs from EventStore
        for (const streamId of this.streamIds) {
            // Get transformed events from EventStore (lazy transformation happens here)
            const events = this.eventStore.getStreamEvents(streamId)
            timelines[streamId] = events

            // Build event index
            const index = new Map<string, number>()
            events.forEach((e, i) => index.set(e.eventId, i))
            eventIndex[streamId] = index

            // Build thread events and index
            const streamThreads: TimelinesMap = {}
            const streamThreadIndex: Record<string, Map<string, number>> = {}

            for (const event of events) {
                if (event.threadParentId) {
                    if (!streamThreads[event.threadParentId]) {
                        streamThreads[event.threadParentId] = []
                    }
                    const threadEvents = streamThreads[event.threadParentId]
                    // Binary insert to maintain order
                    let insertIdx = 0
                    while (insertIdx < threadEvents.length &&
                           threadEvents[insertIdx].eventNum < event.eventNum) {
                        insertIdx++
                    }
                    threadEvents.splice(insertIdx, 0, event)
                }
            }

            // Build thread indexes
            for (const [parentId, threadEvents] of Object.entries(streamThreads)) {
                const tIndex = new Map<string, number>()
                threadEvents.forEach((e, i) => tIndex.set(e.eventId, i))
                streamThreadIndex[parentId] = tIndex
            }

            if (Object.keys(streamThreads).length > 0) {
                threads[streamId] = streamThreads
                threadEventIndex[streamId] = streamThreadIndex
            }
        }

        // Convert auxiliary Maps to Records
        const threadsStats: ThreadStatsMap = {}
        for (const [streamId, streamStats] of this.threadsStats) {
            threadsStats[streamId] = {}
            for (const [parentId, stats] of streamStats) {
                threadsStats[streamId][parentId] = stats
            }
        }

        const reactions: ReactionsMap = {}
        for (const [streamId, streamReactions] of this.reactions) {
            reactions[streamId] = {}
            for (const [parentId, r] of streamReactions) {
                reactions[streamId][parentId] = r
            }
        }

        const tips: TipsMap = {}
        for (const [streamId, streamTips] of this.tips) {
            tips[streamId] = {}
            for (const [parentId, t] of streamTips) {
                tips[streamId][parentId] = t
            }
        }

        const originalEventsRecord: OriginalEventsMap = {}
        for (const [streamId, events] of this.originalEvents) {
            originalEventsRecord[streamId] = {}
            for (const [eventId, event] of events) {
                originalEventsRecord[streamId][eventId] = event
            }
        }

        const replacementLogRecord: ReplacementLogMap = {}
        for (const [streamId, log] of this.replacementLog) {
            replacementLogRecord[streamId] = log
        }

        const pendingReplacedEventsRecord: Record<string, Record<string, TimelineEvent>> = {}
        for (const [streamId, pending] of this.pendingReplacedEvents) {
            pendingReplacedEventsRecord[streamId] = {}
            for (const [eventId, event] of pending) {
                pendingReplacedEventsRecord[streamId][eventId] = event
            }
        }

        const lastestEventByUser: { [userId: string]: TimelineEvent } = {}
        for (const [userId, event] of this.latestEventByUser) {
            lastestEventByUser[userId] = event
        }

        return {
            timelines,
            eventIndex,
            originalEvents: originalEventsRecord,
            replacementLog: replacementLogRecord,
            pendingReplacedEvents: pendingReplacedEventsRecord,
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
