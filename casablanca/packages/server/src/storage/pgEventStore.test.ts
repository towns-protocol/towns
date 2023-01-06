import { FullEvent, genId, StreamKind, StreamsAndCookies, SyncPos } from '@zion/core'
import debug from 'debug'
import util from 'node:util'

import { PGEventStore } from './pgEventStore'
import { setTimeout } from 'timers/promises'

const log = debug('test:PGEventStore')

/**
 * @group explicit-storage
 */
describe('PGEventStore', () => {
    let store: PGEventStore

    beforeAll(async () => {
        store = new PGEventStore()
    })

    afterAll(async () => {
        await store.close()
    })

    const DEFAULT_INITIAL_EVENTS: FullEvent[] = [
        {
            hash: '0x1234',
            signature: '0x5678',
            base: {
                creatorAddress: '0xabcd',
                salt: '42',
                prevEvents: [],
                payload: {
                    kind: 'inception',
                    streamId: 'temp',
                    data: { streamKind: StreamKind.Space },
                },
            },
        },
        {
            hash: '0x1235',
            signature: '0x5678',
            base: {
                creatorAddress: '0xabcd',
                salt: '42',
                prevEvents: ['0x1234'],
                payload: { kind: 'message', text: 'abc' },
            },
        },
        {
            hash: '0x1236',
            signature: '0x5678',
            base: {
                creatorAddress: '0xabcd',
                salt: '42',
                prevEvents: ['0x1235'],
                payload: { kind: 'message', text: 'qqq' },
            },
        },
    ]

    const MORE_EVENTS: FullEvent[] = [
        {
            hash: '0x1237',
            signature: '0x5678',
            base: {
                creatorAddress: '0xabcd',
                salt: '42',
                prevEvents: ['0x1236'],
                payload: { kind: 'message', text: 'well' },
            },
        },
        {
            hash: '0x1238',
            signature: '0x5678',
            base: {
                creatorAddress: '0xabcd',
                salt: '42',
                prevEvents: ['0x1237'],
                payload: { kind: 'message', text: 'finally' },
            },
        },
    ]

    const makeStream = async (
        initialEvents: FullEvent[] = DEFAULT_INITIAL_EVENTS,
    ): Promise<SyncPos> => {
        const streamId = genId()

        await expect(store.streamExists(streamId)).resolves.toBe(false)
        const cookie = await store.createEventStream(streamId, initialEvents)
        await expect(store.streamExists(streamId)).resolves.toBe(true)

        const ret1 = await store.getEventStream(streamId)
        expect(ret1.events).toEqual(initialEvents)
        expect(ret1.syncCookie).toEqual(cookie)
        return { streamId, syncCookie: ret1.syncCookie }
    }

    test('createStreamAndAdd', async () => {
        const { streamId } = await makeStream()

        await store.addEvents(streamId, MORE_EVENTS)
        const res2 = await store.getEventStream(streamId)
        expect(res2.events).toEqual([...DEFAULT_INITIAL_EVENTS, ...MORE_EVENTS])
    })

    test('getNonExistingStream', async () => {
        await expect(store.getEventStream('bad-stream-id')).rejects.toThrow()
    })

    test('readNewEvents', async () => {
        const syncPos = await makeStream()
        const syncPos2 = await makeStream()

        // Empty read
        const ret2 = await store.readNewEvents([syncPos, syncPos2])
        expect(ret2[syncPos.streamId]).toEqual(undefined)
        expect(ret2[syncPos2.streamId]).toEqual(undefined)

        // Read with new events for one of the streams
        await store.addEvents(syncPos.streamId, MORE_EVENTS)
        const ret3 = await store.readNewEvents([syncPos, syncPos2])
        expect(ret3[syncPos.streamId].events).toEqual(MORE_EVENTS)
        expect(ret3[syncPos2.streamId]).toEqual(undefined)
    })

    test('readNewEventsAsyncImmediate', async () => {
        const syncPos = await makeStream()

        // Empty read
        const ret2 = await store.readNewEvents([syncPos], 1)
        expect(ret2).toEqual({})

        // Read with new events
        await store.addEvents(syncPos.streamId, MORE_EVENTS)
        const ret3 = await store.readNewEvents([syncPos], 1)
        expect(ret3[syncPos.streamId].events).toEqual(MORE_EVENTS)
    })

    test('readNewEventsAsyncWait', async () => {
        const syncPos = await makeStream()

        // Empty read
        const readPromise = store.readNewEvents([syncPos], 2000)
        expect(util.inspect(readPromise).includes('pending')).toEqual(true)

        await store.addEvents(syncPos.streamId, MORE_EVENTS)

        // Wait until readPromise is fulfilled
        await expect(readPromise).toResolve()
        const readResult = await readPromise
        log('readNewEventsAsyncMultiWait', 'readResult', readResult)

        const readResult2 = await store.readNewEvents([syncPos], 2000)
        log('readNewEventsAsyncWait', 'readResult2', readResult, readResult2)

        expect(readResult2).not.toBeNull()
        expect(readResult2).toEqual(readResult)
        expect(readResult[syncPos.streamId].events).toEqual(MORE_EVENTS)
    })

    test('readNewEventsAsyncMultiWait', async () => {
        const s0 = await makeStream()
        const s1 = await makeStream()
        const s2 = await makeStream()

        const readPromise = store.readNewEvents([s0, s1, s2], 2000)
        expect(util.inspect(readPromise).includes('pending')).toEqual(true)

        // Wait until DB query is finished before inserting new events
        await setTimeout(500)
        expect(util.inspect(readPromise).includes('pending')).toEqual(true)

        await store.addEvents(s2.streamId, MORE_EVENTS)

        // Wait until readPromise is fulfilled
        await expect(readPromise).toResolve()
        const readResult = await readPromise
        log('readNewEventsAsyncMultiWait', 'readResult', readResult)

        const readResult2 = await store.readNewEvents([s0, s1, s2], 2000)
        log('readNewEventsAsyncWait', 'readResult2', readResult, readResult2)

        expect(readResult).not.toBeNull()
        expect(readResult[s2.streamId].events).toEqual(MORE_EVENTS)
        expect(readResult2).not.toBeNull()
        expect(readResult2).toEqual(readResult)
    })

    test('readNewEventsAsyncWaitTimeout', async () => {
        const syncPos = await makeStream()

        // Empty read
        const readPromise = store.readNewEvents([syncPos], 100)
        expect(util.inspect(readPromise).includes('pending')).toEqual(true)

        // Wait until readPromise is fulfilled
        await expect(readPromise).toResolve()
        const readResult = await readPromise

        log('readNewEventsAsyncWaitTimeout', 'readResult', readResult)
        expect(readResult).not.toBeNull()
        expect(readResult).toEqual({})
    })

    test('deleteAllStreams', async () => {
        await store.createEventStream('stream1', DEFAULT_INITIAL_EVENTS)
        const allStreams = new Set(await store.getEventStreams())
        const deleted = await store.deleteAllEventStreams()
        const res = new Set(await store.getEventStreams())
        for (const id of allStreams) {
            expect(res).not.toContain(id)
        }
    })
})
