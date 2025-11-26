import { describe, it, expect, beforeEach } from 'vitest'
import { EventDedup } from './eventDedup'

describe('EventDedup', () => {
    let dedup: EventDedup

    beforeEach(() => {
        dedup = new EventDedup()
    })

    describe('checkAndAdd', () => {
        it('returns false for new events', () => {
            const eventId = '0x1234567890abcdef'
            expect(dedup.checkAndAdd(eventId)).toBe(false)
        })

        it('returns true for duplicate events', () => {
            const eventId = '0x1234567890abcdef'
            expect(dedup.checkAndAdd(eventId)).toBe(false)
            expect(dedup.checkAndAdd(eventId)).toBe(true)
        })

        it('returns false for different event IDs', () => {
            const eventId1 = '0x1111111111111111'
            const eventId2 = '0x2222222222222222'
            expect(dedup.checkAndAdd(eventId1)).toBe(false)
            expect(dedup.checkAndAdd(eventId2)).toBe(false)
        })

        it('correctly identifies duplicates after many events', () => {
            const eventIds = Array.from(
                { length: 100 },
                (_, i) => `0x${i.toString(16).padStart(64, '0')}`,
            )

            // Add all events
            for (const eventId of eventIds) {
                expect(dedup.checkAndAdd(eventId)).toBe(false)
            }

            // All should be duplicates now
            for (const eventId of eventIds) {
                expect(dedup.checkAndAdd(eventId)).toBe(true)
            }
        })
    })

    describe('has', () => {
        it('returns false for unseen events', () => {
            expect(dedup.has('0xunknown')).toBe(false)
        })

        it('returns true for seen events', () => {
            const eventId = '0x1234567890abcdef'
            dedup.add(eventId)
            expect(dedup.has(eventId)).toBe(true)
        })

        it('does not modify the cache', () => {
            const eventId = '0x1234567890abcdef'
            expect(dedup.has(eventId)).toBe(false)
            expect(dedup.has(eventId)).toBe(false) // Still false, not added
            expect(dedup.size).toBe(0)
        })
    })

    describe('add', () => {
        it('adds an event to the cache', () => {
            const eventId = '0x1234567890abcdef'
            dedup.add(eventId)
            expect(dedup.has(eventId)).toBe(true)
            expect(dedup.size).toBe(1)
        })

        it('does not create duplicate entries', () => {
            const eventId = '0x1234567890abcdef'
            dedup.add(eventId)
            dedup.add(eventId)
            expect(dedup.size).toBe(1) // Still only one entry
        })
    })

    describe('clear', () => {
        it('removes all entries from the cache', () => {
            dedup.add('0x1111')
            dedup.add('0x2222')
            dedup.add('0x3333')
            expect(dedup.size).toBe(3)

            dedup.clear()
            expect(dedup.size).toBe(0)
            expect(dedup.has('0x1111')).toBe(false)
        })
    })

    describe('size', () => {
        it('returns 0 for empty cache', () => {
            expect(dedup.size).toBe(0)
        })

        it('returns correct count after adding events', () => {
            dedup.add('0x1111')
            expect(dedup.size).toBe(1)
            dedup.add('0x2222')
            expect(dedup.size).toBe(2)
        })
    })

    describe('max size eviction', () => {
        it('evicts oldest entries when max size is reached', () => {
            const smallDedup = new EventDedup({ maxSize: 3 })

            smallDedup.add('0x0001')
            smallDedup.add('0x0002')
            smallDedup.add('0x0003')
            expect(smallDedup.size).toBe(3)

            // Adding a 4th should evict the oldest (0x0001)
            smallDedup.add('0x0004')
            expect(smallDedup.size).toBe(3)
            expect(smallDedup.has('0x0001')).toBe(false) // Evicted
            expect(smallDedup.has('0x0002')).toBe(true)
            expect(smallDedup.has('0x0003')).toBe(true)
            expect(smallDedup.has('0x0004')).toBe(true)
        })

        it('evicts in FIFO order', () => {
            const smallDedup = new EventDedup({ maxSize: 2 })

            smallDedup.add('0x0001')
            smallDedup.add('0x0002')
            smallDedup.add('0x0003') // Evicts 0x0001
            smallDedup.add('0x0004') // Evicts 0x0002

            expect(smallDedup.size).toBe(2)
            expect(smallDedup.has('0x0001')).toBe(false)
            expect(smallDedup.has('0x0002')).toBe(false)
            expect(smallDedup.has('0x0003')).toBe(true)
            expect(smallDedup.has('0x0004')).toBe(true)
        })
    })

    describe('default configuration', () => {
        it('uses default maxSize of 10000', () => {
            const defaultDedup = new EventDedup()
            // Add more than default max to verify it doesn't grow unbounded
            for (let i = 0; i < 10005; i++) {
                defaultDedup.add(`0x${i.toString(16).padStart(64, '0')}`)
            }
            expect(defaultDedup.size).toBeLessThanOrEqual(10000)
        })
    })

    describe('custom configuration', () => {
        it('respects custom maxSize', () => {
            const customDedup = new EventDedup({ maxSize: 5 })
            for (let i = 0; i < 10; i++) {
                customDedup.add(`0x${i.toString(16)}`)
            }
            expect(customDedup.size).toBeLessThanOrEqual(5)
        })
    })
})
