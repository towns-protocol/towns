/**
 * EventStore - Normalized event storage with mutable updates and change tracking
 *
 * This is a major architectural optimization that:
 * 1. Stores events once in normalized form (eliminates triple duplication)
 * 2. Uses mutable updates with change tracking (eliminates garbage from immutable patterns)
 * 3. Enables lazy transformation (transform to UI format only when accessed)
 *
 * @see packages/sdk/arch/proposals/streamstate-optimization.md
 */

import { StreamTimelineEvent } from '../../types'
import { TimelineEvent, TimelineEvent_OneOf, EventStatus } from '../models/timelineTypes'
import { toEvent, getFallbackContent } from '../models/timelineEvent'
import { dlogger } from '@towns-protocol/utils'

const logger = dlogger('csb:eventStore')

/**
 * Change types for fine-grained notifications
 */
export type EventChangeType = 'add' | 'update' | 'remove' | 'confirm'

/**
 * Represents a single change to an event
 */
export interface EventChange {
    type: EventChangeType
    eventId: string
    streamId: string
    threadParentId?: string
}

/**
 * Normalized event - stores the raw StreamTimelineEvent and caches transformed TimelineEvent
 */
export interface NormalizedEvent {
    // Core identifiers
    eventId: string
    streamId: string
    eventNum: bigint

    // Raw event data (single source of truth)
    rawEvent: StreamTimelineEvent

    // Cached transformed UI data (lazy computed)
    _cachedTimelineEvent?: TimelineEvent
    _cacheVersion: number

    // Relationship IDs (computed from rawEvent, stored for indexing)
    threadParentId?: string
    replyParentId?: string
    reactionParentId?: string
}

/**
 * EventStore subscriber callback
 */
export type EventStoreSubscriber = (changes: EventChange[]) => void

/**
 * EventStore - Centralized normalized event storage
 *
 * Key optimizations:
 * - Single copy of each event (normalized storage)
 * - O(1) lookups via multiple indexes
 * - Mutable updates with batched change notifications
 * - Lazy transformation with caching
 */
export class EventStore {
    // Primary storage: eventId -> NormalizedEvent
    private events = new Map<string, NormalizedEvent>()

    // Index: streamId -> eventIds in order
    private streamIndex = new Map<string, string[]>()

    // Index: streamId -> parentId -> eventIds (for thread replies)
    private threadIndex = new Map<string, Map<string, string[]>>()

    // Index: streamId -> parentId -> eventIds (for reactions)
    private reactionIndex = new Map<string, Map<string, string[]>>()

    // Change tracking
    private changeBuffer: EventChange[] = []
    private subscribers = new Set<EventStoreSubscriber>()

    // Version for cache invalidation
    private version = 0

    // User ID for transformation context
    constructor(private userId: string) {}

    // ============================================================================
    // Public API - Event Access
    // ============================================================================

    /**
     * Get a single event by ID
     */
    getEvent(eventId: string): NormalizedEvent | undefined {
        return this.events.get(eventId)
    }

    /**
     * Get transformed TimelineEvent (lazy transformation with caching)
     */
    getTimelineEvent(eventId: string): TimelineEvent | undefined {
        const normalized = this.events.get(eventId)
        if (!normalized) return undefined

        // Check if cache is valid
        if (normalized._cachedTimelineEvent && normalized._cacheVersion === this.version) {
            return normalized._cachedTimelineEvent
        }

        // Transform and cache
        const transformed = toEvent(normalized.rawEvent, this.userId)
        normalized._cachedTimelineEvent = transformed
        normalized._cacheVersion = this.version

        return transformed
    }

    /**
     * Get all events for a stream as TimelineEvents
     */
    getStreamEvents(streamId: string): TimelineEvent[] {
        const eventIds = this.streamIndex.get(streamId) ?? []
        return eventIds
            .map((id) => this.getTimelineEvent(id))
            .filter((e): e is TimelineEvent => e !== undefined)
    }

    /**
     * Get event IDs for a stream (for index access)
     */
    getStreamEventIds(streamId: string): string[] {
        return this.streamIndex.get(streamId) ?? []
    }

    /**
     * Get thread events for a parent
     */
    getThreadEvents(streamId: string, parentId: string): TimelineEvent[] {
        const eventIds = this.threadIndex.get(streamId)?.get(parentId) ?? []
        return eventIds
            .map((id) => this.getTimelineEvent(id))
            .filter((e): e is TimelineEvent => e !== undefined)
    }

    /**
     * Get reaction events for a parent
     */
    getReactionEvents(streamId: string, parentId: string): TimelineEvent[] {
        const eventIds = this.reactionIndex.get(streamId)?.get(parentId) ?? []
        return eventIds
            .map((id) => this.getTimelineEvent(id))
            .filter((e): e is TimelineEvent => e !== undefined)
    }

    /**
     * Check if an event exists
     */
    hasEvent(eventId: string): boolean {
        return this.events.has(eventId)
    }

    /**
     * Get event count for a stream
     */
    getStreamEventCount(streamId: string): number {
        return this.streamIndex.get(streamId)?.length ?? 0
    }

    // ============================================================================
    // Public API - Event Mutations (Mutable Updates)
    // ============================================================================

    /**
     * Add an event to the store
     */
    addEvent(
        streamId: string,
        rawEvent: StreamTimelineEvent,
        threadParentId?: string,
        replyParentId?: string,
        reactionParentId?: string,
    ): void {
        const eventId = rawEvent.hashStr

        // Skip if already exists
        if (this.events.has(eventId)) {
            return
        }

        const normalized: NormalizedEvent = {
            eventId,
            streamId,
            eventNum: rawEvent.eventNum,
            rawEvent,
            _cacheVersion: -1, // Force re-transform on first access
            threadParentId,
            replyParentId,
            reactionParentId,
        }

        // Add to primary storage (mutable)
        this.events.set(eventId, normalized)

        // Update stream index (mutable append)
        let streamEvents = this.streamIndex.get(streamId)
        if (!streamEvents) {
            streamEvents = []
            this.streamIndex.set(streamId, streamEvents)
        }
        streamEvents.push(eventId)

        // Update thread index if applicable
        if (threadParentId) {
            let streamThreads = this.threadIndex.get(streamId)
            if (!streamThreads) {
                streamThreads = new Map()
                this.threadIndex.set(streamId, streamThreads)
            }
            let threadEvents = streamThreads.get(threadParentId)
            if (!threadEvents) {
                threadEvents = []
                streamThreads.set(threadParentId, threadEvents)
            }
            // Binary insert by eventNum to maintain order
            const insertIdx = this.binaryFindInsertIndex(threadEvents, rawEvent.eventNum)
            threadEvents.splice(insertIdx, 0, eventId)
        }

        // Update reaction index if applicable
        if (reactionParentId) {
            let streamReactions = this.reactionIndex.get(streamId)
            if (!streamReactions) {
                streamReactions = new Map()
                this.reactionIndex.set(streamId, streamReactions)
            }
            let reactionEvents = streamReactions.get(reactionParentId)
            if (!reactionEvents) {
                reactionEvents = []
                streamReactions.set(reactionParentId, reactionEvents)
            }
            reactionEvents.push(eventId)
        }

        // Buffer change notification
        this.changeBuffer.push({
            type: 'add',
            eventId,
            streamId,
            threadParentId,
        })
    }

    /**
     * Update an existing event's raw data
     */
    updateEvent(eventId: string, rawEvent: StreamTimelineEvent): boolean {
        const normalized = this.events.get(eventId)
        if (!normalized) {
            return false
        }

        // Update raw event (mutable)
        normalized.rawEvent = rawEvent
        normalized._cacheVersion = -1 // Invalidate cache

        // Buffer change notification
        this.changeBuffer.push({
            type: 'update',
            eventId,
            streamId: normalized.streamId,
            threadParentId: normalized.threadParentId,
        })

        return true
    }

    /**
     * Remove an event from the store
     */
    removeEvent(eventId: string): boolean {
        const normalized = this.events.get(eventId)
        if (!normalized) {
            return false
        }

        const { streamId, threadParentId, reactionParentId } = normalized

        // Remove from primary storage
        this.events.delete(eventId)

        // Remove from stream index
        const streamEvents = this.streamIndex.get(streamId)
        if (streamEvents) {
            const idx = streamEvents.indexOf(eventId)
            if (idx !== -1) {
                streamEvents.splice(idx, 1)
            }
        }

        // Remove from thread index
        if (threadParentId) {
            const threadEvents = this.threadIndex.get(streamId)?.get(threadParentId)
            if (threadEvents) {
                const idx = threadEvents.indexOf(eventId)
                if (idx !== -1) {
                    threadEvents.splice(idx, 1)
                }
            }
        }

        // Remove from reaction index
        if (reactionParentId) {
            const reactionEvents = this.reactionIndex.get(streamId)?.get(reactionParentId)
            if (reactionEvents) {
                const idx = reactionEvents.indexOf(eventId)
                if (idx !== -1) {
                    reactionEvents.splice(idx, 1)
                }
            }
        }

        // Buffer change notification
        this.changeBuffer.push({
            type: 'remove',
            eventId,
            streamId,
            threadParentId,
        })

        return true
    }

    /**
     * Prepend an event (for loading history)
     */
    prependEvent(
        streamId: string,
        rawEvent: StreamTimelineEvent,
        threadParentId?: string,
        replyParentId?: string,
        reactionParentId?: string,
    ): void {
        const eventId = rawEvent.hashStr

        // Skip if already exists
        if (this.events.has(eventId)) {
            return
        }

        const normalized: NormalizedEvent = {
            eventId,
            streamId,
            eventNum: rawEvent.eventNum,
            rawEvent,
            _cacheVersion: -1,
            threadParentId,
            replyParentId,
            reactionParentId,
        }

        // Add to primary storage
        this.events.set(eventId, normalized)

        // Prepend to stream index
        let streamEvents = this.streamIndex.get(streamId)
        if (!streamEvents) {
            streamEvents = []
            this.streamIndex.set(streamId, streamEvents)
        }
        streamEvents.unshift(eventId)

        // Thread and reaction index handling same as addEvent
        if (threadParentId) {
            let streamThreads = this.threadIndex.get(streamId)
            if (!streamThreads) {
                streamThreads = new Map()
                this.threadIndex.set(streamId, streamThreads)
            }
            let threadEvents = streamThreads.get(threadParentId)
            if (!threadEvents) {
                threadEvents = []
                streamThreads.set(threadParentId, threadEvents)
            }
            const insertIdx = this.binaryFindInsertIndex(threadEvents, rawEvent.eventNum)
            threadEvents.splice(insertIdx, 0, eventId)
        }

        if (reactionParentId) {
            let streamReactions = this.reactionIndex.get(streamId)
            if (!streamReactions) {
                streamReactions = new Map()
                this.reactionIndex.set(streamId, streamReactions)
            }
            let reactionEvents = streamReactions.get(reactionParentId)
            if (!reactionEvents) {
                reactionEvents = []
                streamReactions.set(reactionParentId, reactionEvents)
            }
            reactionEvents.unshift(eventId)
        }

        this.changeBuffer.push({
            type: 'add',
            eventId,
            streamId,
            threadParentId,
        })
    }

    /**
     * Initialize a stream (clear existing data for stream)
     */
    initializeStream(streamId: string): void {
        // Remove all existing events for this stream
        const existingIds = this.streamIndex.get(streamId) ?? []
        for (const eventId of existingIds) {
            this.events.delete(eventId)
        }

        // Clear indexes for this stream
        this.streamIndex.set(streamId, [])
        this.threadIndex.delete(streamId)
        this.reactionIndex.delete(streamId)
    }

    /**
     * Clear all data for multiple streams
     */
    clearStreams(streamIds: string[]): void {
        for (const streamId of streamIds) {
            const existingIds = this.streamIndex.get(streamId) ?? []
            for (const eventId of existingIds) {
                this.events.delete(eventId)
            }
            this.streamIndex.delete(streamId)
            this.threadIndex.delete(streamId)
            this.reactionIndex.delete(streamId)
        }
    }

    // ============================================================================
    // Public API - Change Notifications
    // ============================================================================

    /**
     * Subscribe to change notifications
     */
    subscribe(subscriber: EventStoreSubscriber): () => void {
        this.subscribers.add(subscriber)
        return () => this.subscribers.delete(subscriber)
    }

    /**
     * Flush buffered changes to subscribers
     * Call this after a batch of mutations
     */
    flushChanges(): void {
        if (this.changeBuffer.length === 0) return

        const changes = this.changeBuffer
        this.changeBuffer = []
        this.version++

        for (const subscriber of this.subscribers) {
            try {
                subscriber(changes)
            } catch (e) {
                logger.error('EventStore subscriber error', e)
            }
        }
    }

    /**
     * Get pending changes without flushing
     */
    getPendingChanges(): EventChange[] {
        return [...this.changeBuffer]
    }

    // ============================================================================
    // Private Helpers
    // ============================================================================

    /**
     * Binary search to find insertion index for maintaining sorted order by eventNum
     */
    private binaryFindInsertIndex(eventIds: string[], eventNum: bigint): number {
        let low = 0
        let high = eventIds.length

        while (low < high) {
            const mid = (low + high) >>> 1
            const midEvent = this.events.get(eventIds[mid])
            if (midEvent && midEvent.eventNum < eventNum) {
                low = mid + 1
            } else {
                high = mid
            }
        }

        return low
    }
}

/**
 * TimelineAccessor - Lazy transformation layer on top of EventStore
 *
 * Provides the same interface as the current TimelineEvent[] arrays
 * but transforms events lazily and caches results.
 */
export class TimelineAccessor {
    private transformCache = new Map<string, TimelineEvent>()
    private cacheVersion = -1

    constructor(
        private eventStore: EventStore,
        private userId: string,
    ) {}

    /**
     * Get a single transformed event (with caching)
     */
    getEvent(eventId: string): TimelineEvent | undefined {
        return this.eventStore.getTimelineEvent(eventId)
    }

    /**
     * Get all events for a stream
     */
    getStreamTimeline(streamId: string): TimelineEvent[] {
        return this.eventStore.getStreamEvents(streamId)
    }

    /**
     * Get thread events for a parent
     */
    getThreadTimeline(streamId: string, parentId: string): TimelineEvent[] {
        return this.eventStore.getThreadEvents(streamId, parentId)
    }

    /**
     * Find event index by eventId (O(n) but could be optimized)
     */
    findEventIndex(streamId: string, eventId: string): number {
        const eventIds = this.eventStore.getStreamEventIds(streamId)
        return eventIds.indexOf(eventId)
    }

    /**
     * Invalidate cache for specific events
     */
    invalidate(eventIds: string[]): void {
        for (const eventId of eventIds) {
            this.transformCache.delete(eventId)
        }
    }

    /**
     * Clear all caches
     */
    clearCache(): void {
        this.transformCache.clear()
    }
}
