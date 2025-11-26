import { describe, it, expect, beforeEach } from 'vitest'
import { EventDedup } from './eventDedup'

describe('EventDedup', () => {
    let dedup: EventDedup

    beforeEach(() => {
        dedup = new EventDedup()
    })

    describe('checkAndAdd', () => {
        it('returns false for new events', () => {
            const streamId = '0xstream1'
            const eventId = '0x1234567890abcdef'
            expect(dedup.checkAndAdd(streamId, eventId)).toBe(false)
        })

        it('returns true for duplicate events in same stream', () => {
            const streamId = '0xstream1'
            const eventId = '0x1234567890abcdef'
            expect(dedup.checkAndAdd(streamId, eventId)).toBe(false)
            expect(dedup.checkAndAdd(streamId, eventId)).toBe(true)
        })

        it('returns false for same event ID in different streams', () => {
            const streamId1 = '0xstream1'
            const streamId2 = '0xstream2'
            const eventId = '0x1234567890abcdef'
            expect(dedup.checkAndAdd(streamId1, eventId)).toBe(false)
            expect(dedup.checkAndAdd(streamId2, eventId)).toBe(false) // Different stream, not a duplicate
        })

        it('returns false for different event IDs in same stream', () => {
            const streamId = '0xstream1'
            const eventId1 = '0x1111111111111111'
            const eventId2 = '0x2222222222222222'
            expect(dedup.checkAndAdd(streamId, eventId1)).toBe(false)
            expect(dedup.checkAndAdd(streamId, eventId2)).toBe(false)
        })

        it('correctly identifies duplicates after many events', () => {
            const streamId = '0xstream1'
            const eventIds = Array.from(
                { length: 100 },
                (_, i) => `0x${i.toString(16).padStart(64, '0')}`,
            )

            // Add all events
            for (const eventId of eventIds) {
                expect(dedup.checkAndAdd(streamId, eventId)).toBe(false)
            }

            // All should be duplicates now
            for (const eventId of eventIds) {
                expect(dedup.checkAndAdd(streamId, eventId)).toBe(true)
            }
        })
    })

    describe('has', () => {
        it('returns false for unseen events', () => {
            expect(dedup.has('0xstream1', '0xunknown')).toBe(false)
        })

        it('returns true for seen events', () => {
            const streamId = '0xstream1'
            const eventId = '0x1234567890abcdef'
            dedup.add(streamId, eventId)
            expect(dedup.has(streamId, eventId)).toBe(true)
        })

        it('returns false for event in different stream', () => {
            const streamId1 = '0xstream1'
            const streamId2 = '0xstream2'
            const eventId = '0x1234567890abcdef'
            dedup.add(streamId1, eventId)
            expect(dedup.has(streamId1, eventId)).toBe(true)
            expect(dedup.has(streamId2, eventId)).toBe(false)
        })

        it('does not modify the cache', () => {
            const streamId = '0xstream1'
            const eventId = '0x1234567890abcdef'
            expect(dedup.has(streamId, eventId)).toBe(false)
            expect(dedup.has(streamId, eventId)).toBe(false) // Still false, not added
            expect(dedup.size).toBe(0)
        })
    })

    describe('add', () => {
        it('adds an event to the cache', () => {
            const streamId = '0xstream1'
            const eventId = '0x1234567890abcdef'
            dedup.add(streamId, eventId)
            expect(dedup.has(streamId, eventId)).toBe(true)
            expect(dedup.size).toBe(1)
        })

        it('does not create duplicate entries', () => {
            const streamId = '0xstream1'
            const eventId = '0x1234567890abcdef'
            dedup.add(streamId, eventId)
            dedup.add(streamId, eventId)
            expect(dedup.size).toBe(1) // Still only one entry
        })

        it('creates separate caches for different streams', () => {
            const streamId1 = '0xstream1'
            const streamId2 = '0xstream2'
            dedup.add(streamId1, '0x1111')
            dedup.add(streamId2, '0x2222')
            expect(dedup.size).toBe(2)
            expect(dedup.streamCount).toBe(2)
        })
    })

    describe('clear', () => {
        it('removes all entries from all stream caches', () => {
            dedup.add('0xstream1', '0x1111')
            dedup.add('0xstream1', '0x2222')
            dedup.add('0xstream2', '0x3333')
            expect(dedup.size).toBe(3)
            expect(dedup.streamCount).toBe(2)

            dedup.clear()
            expect(dedup.size).toBe(0)
            expect(dedup.streamCount).toBe(0)
            expect(dedup.has('0xstream1', '0x1111')).toBe(false)
        })
    })

    describe('size', () => {
        it('returns 0 for empty cache', () => {
            expect(dedup.size).toBe(0)
        })

        it('returns correct count across all streams', () => {
            dedup.add('0xstream1', '0x1111')
            expect(dedup.size).toBe(1)
            dedup.add('0xstream1', '0x2222')
            expect(dedup.size).toBe(2)
            dedup.add('0xstream2', '0x3333')
            expect(dedup.size).toBe(3)
        })
    })

    describe('streamCount', () => {
        it('returns 0 for empty cache', () => {
            expect(dedup.streamCount).toBe(0)
        })

        it('returns correct number of streams', () => {
            dedup.add('0xstream1', '0x1111')
            expect(dedup.streamCount).toBe(1)
            dedup.add('0xstream1', '0x2222') // Same stream
            expect(dedup.streamCount).toBe(1)
            dedup.add('0xstream2', '0x3333') // Different stream
            expect(dedup.streamCount).toBe(2)
            dedup.add('0xstream3', '0x4444')
            expect(dedup.streamCount).toBe(3)
        })
    })

    describe('per-stream max size eviction', () => {
        it('evicts oldest entries when max size per stream is reached', () => {
            const smallDedup = new EventDedup({ maxSizePerStream: 3 })
            const streamId = '0xstream1'

            smallDedup.add(streamId, '0x0001')
            smallDedup.add(streamId, '0x0002')
            smallDedup.add(streamId, '0x0003')
            expect(smallDedup.size).toBe(3)

            // Adding a 4th should evict the oldest (0x0001)
            smallDedup.add(streamId, '0x0004')
            expect(smallDedup.size).toBe(3)
            expect(smallDedup.has(streamId, '0x0001')).toBe(false) // Evicted
            expect(smallDedup.has(streamId, '0x0002')).toBe(true)
            expect(smallDedup.has(streamId, '0x0003')).toBe(true)
            expect(smallDedup.has(streamId, '0x0004')).toBe(true)
        })

        it('evicts in FIFO order per stream', () => {
            const smallDedup = new EventDedup({ maxSizePerStream: 2 })
            const streamId = '0xstream1'

            smallDedup.add(streamId, '0x0001')
            smallDedup.add(streamId, '0x0002')
            smallDedup.add(streamId, '0x0003') // Evicts 0x0001
            smallDedup.add(streamId, '0x0004') // Evicts 0x0002

            expect(smallDedup.size).toBe(2)
            expect(smallDedup.has(streamId, '0x0001')).toBe(false)
            expect(smallDedup.has(streamId, '0x0002')).toBe(false)
            expect(smallDedup.has(streamId, '0x0003')).toBe(true)
            expect(smallDedup.has(streamId, '0x0004')).toBe(true)
        })

        it('does not affect other streams when evicting', () => {
            const smallDedup = new EventDedup({ maxSizePerStream: 2 })
            const stream1 = '0xstream1'
            const stream2 = '0xstream2'

            // Fill stream1
            smallDedup.add(stream1, '0x0001')
            smallDedup.add(stream1, '0x0002')

            // Fill stream2
            smallDedup.add(stream2, '0x1001')
            smallDedup.add(stream2, '0x1002')

            expect(smallDedup.size).toBe(4)
            expect(smallDedup.streamCount).toBe(2)

            // Add to stream1, causing eviction in stream1 only
            smallDedup.add(stream1, '0x0003')

            // Stream1 should have evicted 0x0001
            expect(smallDedup.has(stream1, '0x0001')).toBe(false)
            expect(smallDedup.has(stream1, '0x0002')).toBe(true)
            expect(smallDedup.has(stream1, '0x0003')).toBe(true)

            // Stream2 should be unaffected
            expect(smallDedup.has(stream2, '0x1001')).toBe(true)
            expect(smallDedup.has(stream2, '0x1002')).toBe(true)

            expect(smallDedup.size).toBe(4) // 2 in each stream
        })
    })

    describe('stream isolation', () => {
        it('hot stream does not push out events from quiet stream', () => {
            const smallDedup = new EventDedup({ maxSizePerStream: 3 })
            const hotStream = '0xhot'
            const quietStream = '0xquiet'

            // Add event to quiet stream
            smallDedup.add(quietStream, '0xquiet_event')

            // Flood hot stream with many events
            for (let i = 0; i < 100; i++) {
                smallDedup.add(hotStream, `0xhot_${i.toString(16).padStart(4, '0')}`)
            }

            // Quiet stream event should still be there
            expect(smallDedup.has(quietStream, '0xquiet_event')).toBe(true)

            // Hot stream should only have last 3 events
            expect(smallDedup.has(hotStream, '0xhot_0061')).toBe(true) // 97
            expect(smallDedup.has(hotStream, '0xhot_0062')).toBe(true) // 98
            expect(smallDedup.has(hotStream, '0xhot_0063')).toBe(true) // 99
            expect(smallDedup.has(hotStream, '0xhot_0000')).toBe(false) // Old, evicted
        })
    })

    describe('default configuration', () => {
        it('uses default maxSizePerStream of 2000', () => {
            const defaultDedup = new EventDedup()
            const streamId = '0xstream1'

            // Add more than default max to verify it doesn't grow unbounded
            for (let i = 0; i < 2005; i++) {
                defaultDedup.add(streamId, `0x${i.toString(16).padStart(64, '0')}`)
            }
            expect(defaultDedup.size).toBeLessThanOrEqual(2000)
        })
    })

    describe('custom configuration', () => {
        it('respects custom maxSizePerStream', () => {
            const customDedup = new EventDedup({ maxSizePerStream: 5 })
            const streamId = '0xstream1'

            for (let i = 0; i < 10; i++) {
                customDedup.add(streamId, `0x${i.toString(16)}`)
            }
            expect(customDedup.size).toBeLessThanOrEqual(5)
        })
    })
})
