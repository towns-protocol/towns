import { afterAll, beforeAll, describe, expect, test } from '@jest/globals'
import { FullEvent, genId, StreamKind, StreamsAndCookies, SyncPos } from '@zion/core'
import debug from 'debug'
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
        let readResult: StreamsAndCookies | null = null
        const ret2 = store.readNewEvents([syncPos], 2000).then((res) => {
            readResult = res
            return 'done'
        })
        await setTimeout(200)

        expect(readResult).toEqual(null)

        await store.addEvents(syncPos.streamId, MORE_EVENTS)
        await setTimeout(100)
        log('readNewEventsAsyncWait', 'readResult', readResult)
        expect(readResult).not.toBeNull()
        expect(readResult![syncPos.streamId].events).toEqual(MORE_EVENTS)
    })

    test('readNewEventsAsyncMultiWait', async () => {
        const s0 = await makeStream()
        const s1 = await makeStream()
        const s2 = await makeStream()

        let readResult: StreamsAndCookies | null = null
        const readPromise = store.readNewEvents([s0, s1, s2], 2000).then((res) => {
            readResult = res
            return 'done'
        })
        await setTimeout(500)

        expect(readResult).toBeNull()

        await store.addEvents(s2.streamId, MORE_EVENTS)
        await setTimeout(100)

        await expect(readPromise).resolves.toBe('done')
        log('readNewEventsAsyncMultiWait', 'readResult', readResult)
        expect(readResult).not.toBeNull()
        expect(readResult![s2.streamId].events).toEqual(MORE_EVENTS)
    })

    test('readNewEventsAsyncWaitTimeout', async () => {
        const syncPos = await makeStream()

        // Empty read
        let readResult: StreamsAndCookies | null = null
        const ret2 = store.readNewEvents([syncPos], 100).then((res) => {
            readResult = res
            return 'done'
        })

        expect(readResult).toEqual(null)

        await setTimeout(200)

        log('readNewEventsAsyncWaitTimeout', 'readResult', readResult)
        expect(readResult).not.toBeNull()
        expect(readResult).toEqual({})
    })
})
