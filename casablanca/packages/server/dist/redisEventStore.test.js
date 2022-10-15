"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const core_1 = require("@zion/core");
const debug_1 = __importDefault(require("debug"));
const nanoid_1 = require("nanoid");
const promises_1 = require("timers/promises");
const redisEventStore_1 = require("./redisEventStore");
const log = (0, debug_1.default)('test:RedisEventStore');
(0, globals_1.describe)('RedisEventStore', () => {
    let store;
    (0, globals_1.beforeAll)(async () => {
        store = new redisEventStore_1.RedisEventStore();
    });
    (0, globals_1.afterAll)(async () => {
        await store.close();
    });
    const DEFAULT_INITIAL_EVENTS = [
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
                    data: { streamKind: core_1.StreamKind.Space },
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
    ];
    const MORE_EVENTS = [
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
    ];
    const makeStream = async (initialEvents = DEFAULT_INITIAL_EVENTS) => {
        const streamId = 'stream-' + (0, nanoid_1.nanoid)();
        await (0, globals_1.expect)(store.streamExists(streamId)).resolves.toBe(false);
        const cookie = await store.createEventStream(streamId, initialEvents);
        await (0, globals_1.expect)(store.streamExists(streamId)).resolves.toBe(true);
        const ret1 = await store.getEventStream(streamId);
        (0, globals_1.expect)(ret1.events).toEqual(initialEvents);
        (0, globals_1.expect)(ret1.syncCookie).toEqual(cookie);
        return { streamId, syncCookie: ret1.syncCookie };
    };
    (0, globals_1.test)('createStreamAndAdd', async () => {
        const { streamId } = await makeStream();
        await store.addEvents(streamId, MORE_EVENTS);
        const res2 = await store.getEventStream(streamId);
        (0, globals_1.expect)(res2.events).toEqual([...DEFAULT_INITIAL_EVENTS, ...MORE_EVENTS]);
    });
    (0, globals_1.test)('getNonExistingStream', async () => {
        await (0, globals_1.expect)(store.getEventStream('bad-stream-id')).rejects.toThrow();
    });
    (0, globals_1.test)('readNewEvents', async () => {
        const syncPos = await makeStream();
        // Empty read
        const ret2 = await store.readNewEvents([syncPos]);
        (0, globals_1.expect)(ret2).toEqual({});
        // Read with new events
        await store.addEvents(syncPos.streamId, MORE_EVENTS);
        const ret3 = await store.readNewEvents([syncPos]);
        (0, globals_1.expect)(ret3[syncPos.streamId].events).toEqual(MORE_EVENTS);
    });
    (0, globals_1.test)('readNewEventsAsyncImmediate', async () => {
        const syncPos = await makeStream();
        // Empty read
        const ret2 = await store.readNewEvents([syncPos], 1);
        (0, globals_1.expect)(ret2).toEqual({});
        // Read with new events
        await store.addEvents(syncPos.streamId, MORE_EVENTS);
        const ret3 = await store.readNewEvents([syncPos], 1);
        (0, globals_1.expect)(ret3[syncPos.streamId].events).toEqual(MORE_EVENTS);
    });
    (0, globals_1.test)('readNewEventsAsyncWait', async () => {
        const syncPos = await makeStream();
        let readResult = null;
        store.readNewEvents([syncPos], 2000).then((res) => (readResult = res));
        (0, globals_1.expect)(readResult).toEqual(null);
        await store.addEvents(syncPos.streamId, MORE_EVENTS);
        await (0, promises_1.setTimeout)(100);
        log('readNewEventsAsyncWait', 'readResult', readResult);
        (0, globals_1.expect)(readResult).not.toBeNull();
        (0, globals_1.expect)(readResult[syncPos.streamId].events).toEqual(MORE_EVENTS);
    });
    (0, globals_1.test)('readNewEventsAsyncMultiWait', async () => {
        const s0 = await makeStream();
        const s1 = await makeStream();
        const s2 = await makeStream();
        let readResult = null;
        const readPromise = store.readNewEvents([s0, s1, s2], 2000).then((res) => {
            readResult = res;
            return 'done';
        });
        (0, globals_1.expect)(readResult).toBeNull();
        await store.addEvents(s2.streamId, MORE_EVENTS);
        await (0, globals_1.expect)(readPromise).resolves.toBe('done');
        log('readNewEventsAsyncWait', 'readResult', readResult);
        (0, globals_1.expect)(readResult).not.toBeNull();
        (0, globals_1.expect)(readResult[s2.streamId].events).toEqual(MORE_EVENTS);
    });
});
