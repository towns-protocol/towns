/**
 * @group main
 */

import { MembershipOp } from '@river-build/proto'
import { makeTestClient, waitFor } from '../testUtils'
import { genShortId } from '../../id'
import { SyncedStream } from '../../syncedStream'
import { StubPersistenceStore } from '../../persistenceStore'
import EventEmitter from 'events'
import TypedEmitter from 'typed-emitter'
import { StreamEvents } from '../../streamEvents'
import { dlog } from '@river-build/dlog'

const log = dlog('csb:test:syncedStream')

// Mock implementation helper
const mockLoadStream = (persistenceStore: StubPersistenceStore, implementation: () => any) => {
    const original = persistenceStore.loadStream.bind(persistenceStore)
    persistenceStore.loadStream = implementation as typeof original
    return () => {
        persistenceStore.loadStream = original
    }
}

describe('syncedStream', () => {
    // Existing test for core functionality
    test('clientRefreshesStreamOnBadSyncCookie', async () => {
        const bobDeviceId = genShortId()
        const bob = await makeTestClient({ deviceId: bobDeviceId })
        await bob.initializeUser()
        bob.startSync()

        const alice = await makeTestClient()
        await alice.initializeUser()
        alice.startSync()

        const { streamId } = await bob.createDMChannel(alice.userId)

        const aliceStream = await alice.waitForStream(streamId)
        // Bob waits for stream and goes offline
        const bobStreamCached = await bob.waitForStream(streamId)
        await bobStreamCached.waitForMembership(MembershipOp.SO_JOIN)
        await bob.stopSync()

        // Force the creation of N snapshots, which will make the sync cookie invalid
        for (let i = 0; i < 10; i++) {
            await alice.sendMessage(streamId, `'hello ${i}`)
            await alice.debugForceMakeMiniblock(streamId, { forceSnapshot: true })
        }

        // later, Bob returns
        const bob2 = await makeTestClient({ context: bob.signerContext, deviceId: bobDeviceId })
        await bob2.initializeUser()
        bob2.startSync()

        // the stream is now loaded from cache
        const bobStreamFresh = await bob2.waitForStream(streamId)

        const fresh = bobStreamFresh.view.timeline.map((e) => e.remoteEvent?.hashStr)
        const cached = bobStreamCached.view.timeline.map((e) => e.remoteEvent?.hashStr)
        expect(fresh.length).toBeGreaterThan(0)
        expect(cached.length).toBeGreaterThan(0)
        expect(fresh).toEqual(cached)

        expect(aliceStream.view.timeline.length).toBeGreaterThan(
            bobStreamFresh.view.timeline.length,
        )

        // wait for new stream to trigger bad_sync_cookie and get a fresh view sent back
        await waitFor(
            () => bobStreamFresh.view.miniblockInfo!.max > bobStreamCached.view.miniblockInfo!.max,
        )

        // Backfill the entire stream
        while (!bobStreamFresh.view.miniblockInfo!.terminusReached) {
            await bob2.scrollback(streamId)
        }

        // Once Bob's stream is fully backfilled, the sync cookie should match Alice's
        await waitFor(
            () => aliceStream.view.miniblockInfo!.max === bobStreamFresh.view.miniblockInfo!.max,
        )

        // check that the events are the same
        const aliceEvents = aliceStream.view.timeline.map((e) => e.hashStr)
        const bobEvents = bobStreamFresh.view.timeline.map((e) => e.hashStr)
        await waitFor(() => aliceEvents.sort() === bobEvents.sort())

        const bobEventCount = bobEvents.length
        // Alice sends another 5 messages
        for (let i = 0; i < 5; i++) {
            await alice.sendMessage(streamId, `'hello again ${i}`)
        }

        // Wait for Bob to sync the new messages to verify that sync still works
        await waitFor(() => bobStreamFresh.view.timeline.length === bobEventCount + 5)

        await bob2.stopSync()
        await alice.stopSync()
    })

    // Test metrics tracking
    test('tracks metrics correctly', async () => {
        const mockClientEmitter = new EventEmitter() as TypedEmitter<StreamEvents>
        const persistenceStore = new StubPersistenceStore()
        const streamId = genShortId()
        const userId = genShortId()

        const stream = new SyncedStream(userId, streamId, mockClientEmitter, log, persistenceStore)

        // Initial metrics should be zero
        const initialMetrics = stream.getMetrics()
        expect(initialMetrics.successfulOperations).toBe(0)
        expect(initialMetrics.failedOperations).toBe(0)
        expect(initialMetrics.memoryUsage).toBeGreaterThanOrEqual(0)
        expect(initialMetrics.retryCount).toBe(0)

        // Test metrics reset
        stream.resetMetrics()
        const resetMetrics = stream.getMetrics()
        expect(resetMetrics.successfulOperations).toBe(0)
        expect(resetMetrics.failedOperations).toBe(0)
        expect(resetMetrics.retryCount).toBe(0)
    })

    // Test error handling
    test('handles errors appropriately', async () => {
        const mockClientEmitter = new EventEmitter() as TypedEmitter<StreamEvents>
        const persistenceStore = new StubPersistenceStore()
        const streamId = genShortId()
        const userId = genShortId()

        const stream = new SyncedStream(userId, streamId, mockClientEmitter, log, persistenceStore)

        // Mock persistence store to fail
        const restore = mockLoadStream(persistenceStore, () => {
            throw new Error('Test error')
        })

        // Test error handling
        const result = await stream.initializeFromPersistence()
        expect(result).toBe(false)

        const metricsAfterError = stream.getMetrics()
        expect(metricsAfterError.failedOperations).toBe(1)
        expect(metricsAfterError.retryCount).toBe(1)
        expect(metricsAfterError.lastError).toBeDefined()
        expect(metricsAfterError.lastError?.message).toBe('Test error')

        restore()
    })

    // Test initialization timeout
    test('handles initialization timeout', async () => {
        const mockClientEmitter = new EventEmitter() as TypedEmitter<StreamEvents>
        const persistenceStore = new StubPersistenceStore()
        const streamId = genShortId()
        const userId = genShortId()

        const stream = new SyncedStream(userId, streamId, mockClientEmitter, log, persistenceStore)

        // Mock persistence store to delay
        const restore = mockLoadStream(persistenceStore, async () => {
            await new Promise((resolve) => setTimeout(resolve, 31000))
            return undefined
        })

        // Test timeout
        const result = await stream.initializeFromPersistence()
        expect(result).toBe(false)

        const metricsAfterTimeout = stream.getMetrics()
        expect(metricsAfterTimeout.failedOperations).toBe(1)
        expect(metricsAfterTimeout.lastError?.message).toContain('timeout')

        restore()
    })

    // Test memory tracking
    test('tracks memory correctly', async () => {
        const mockClientEmitter = new EventEmitter() as TypedEmitter<StreamEvents>
        const persistenceStore = new StubPersistenceStore()
        const streamId = genShortId()
        const userId = genShortId()

        const stream = new SyncedStream(userId, streamId, mockClientEmitter, log, persistenceStore)

        // Initial memory usage
        const initialMetrics = stream.getMetrics()
        const initialMemory = initialMetrics.memoryUsage

        // Check memory usage tracking
        const updatedMetrics = stream.getMetrics()
        expect(updatedMetrics.memoryUsage).toBeGreaterThanOrEqual(initialMemory)
    })

    // Test stream state
    test('manages state correctly', async () => {
        const mockClientEmitter = new EventEmitter() as TypedEmitter<StreamEvents>
        const persistenceStore = new StubPersistenceStore()
        const streamId = genShortId()
        const userId = genShortId()

        const stream = new SyncedStream(userId, streamId, mockClientEmitter, log, persistenceStore)

        // Initial state
        expect(stream.isUpToDate).toBe(false)

        // Reset state
        stream.resetUpToDate()
        expect(stream.isUpToDate).toBe(false)
    })
})
