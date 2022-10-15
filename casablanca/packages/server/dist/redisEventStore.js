"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisEventStore = exports.createRedis = void 0;
const core_1 = require("@zion/core");
const debug_1 = __importDefault(require("debug"));
const ioredis_1 = __importDefault(require("ioredis"));
const lodash_1 = __importDefault(require("lodash"));
const config_1 = require("./config");
const log = (0, debug_1.default)('zion:RedisEventStore');
const createRedis = () => new ioredis_1.default(config_1.config.redisUrl);
exports.createRedis = createRedis;
const REDIS_STREAM_PREFIX = 'es:';
// TODO: change throws to throwWithCode
class RedisEventStore {
    redis;
    redisPoolInUse = [];
    redisPoolAvailable = [];
    constructor(redis) {
        this.redis = redis ?? (0, exports.createRedis)();
    }
    async close() {
        this.redis.disconnect();
        this.redisPoolInUse.forEach((redis) => redis.disconnect());
        this.redisPoolAvailable.forEach((redis) => redis.disconnect());
    }
    getFromPool() {
        let ret;
        if (this.redisPoolAvailable.length > 0) {
            ret = this.redisPoolAvailable.pop();
        }
        else {
            ret = this.redis.duplicate();
        }
        this.redisPoolInUse.push(ret);
        return ret;
    }
    realeaseToPool(redis) {
        lodash_1.default.pull(this.redisPoolInUse, redis);
        this.redisPoolAvailable.push(redis);
    }
    async addEventsImpl(streamId, events, newStream) {
        if (events.length <= 0) {
            throw new Error('Events must not be empty');
        }
        log('addEvents', 'streamId', streamId, 'events', events);
        const multi = this.redis.multi();
        const streamKey = REDIS_STREAM_PREFIX + streamId;
        const noMk = newStream ? [] : ['NOMKSTREAM'];
        events.forEach((event) => {
            multi.xadd(streamKey, ...noMk, '*', 'event', JSON.stringify(event));
        });
        const result = await multi.exec();
        if (result === null || result.length === 0) {
            throw new Error('Failed to add events');
        }
        return result[result.length - 1][1];
    }
    /**
     *
     * @param streamId
     * @param inceptionEvents
     * @returns sync cookie for reading new events from the stream
     */
    async createEventStream(streamId, inceptionEvents) {
        return this.addEventsImpl(streamId, inceptionEvents, true);
    }
    /**
     *
     * @param streamId
     * @param events
     * @returns sync cookie for reading new events from the stream
     */
    async addEvents(streamId, events) {
        return this.addEventsImpl(streamId, events, false);
    }
    async streamExists(streamId) {
        const ret = await this.redis.xrange(REDIS_STREAM_PREFIX + streamId, '-', '+', 'COUNT', 1);
        log('streamExists', streamId, 'ret', ret);
        return ret.length > 0;
    }
    async getEventStream(streamId) {
        const ret = await this.redis.xrange(REDIS_STREAM_PREFIX + streamId, '-', '+');
        log('getEventStream', streamId, 'ret', ret);
        if (ret.length <= 0) {
            (0, core_1.throwWithCode)('Stream not found', core_1.Err.STREAM_NOT_FOUND);
        }
        return {
            events: ret.map((item) => JSON.parse(item[1][1])),
            syncCookie: ret[ret.length - 1][0],
        };
    }
    async callOnPool(f, ...args) {
        const anotherRedis = this.getFromPool();
        try {
            return await Reflect.apply(f, anotherRedis, args);
        }
        finally {
            this.realeaseToPool(anotherRedis);
        }
    }
    async readNewEvents(args, timeousMs = 0) {
        if (args.length <= 0) {
            throw new Error('args must not be empty');
        }
        const streamIds = args.map((arg) => REDIS_STREAM_PREFIX + arg.streamId);
        const cookies = args.map((arg) => arg.syncCookie);
        log('readNewEvents', 'readArgs', ...streamIds, ...cookies);
        let ret;
        if (timeousMs > 0) {
            ret = await this.callOnPool(this.redis.xread, 'COUNT', 100, 'BLOCK', timeousMs, 'STREAMS', ...streamIds, ...cookies);
        }
        else {
            ret = await this.redis.xread('COUNT', 100, 'STREAMS', ...streamIds, ...cookies);
        }
        if (ret === null || ret.length === 0) {
            log('readNewEvents', 'ret is null or empty');
            return {};
        }
        return ret.reduce((acc, item, i) => {
            log('readNewEvents', 'ret', i, item[0], item[1]);
            const streamId = item[0].slice(REDIS_STREAM_PREFIX.length);
            const originalSyncCookie = args.find((arg) => arg.streamId === streamId)?.syncCookie;
            let syncCookie = '0-0';
            const events = item[1].map((elem) => {
                syncCookie = elem[0];
                return JSON.parse(elem[1][1]);
            });
            acc[streamId] = {
                events,
                syncCookie,
                originalSyncCookie,
            };
            return acc;
        }, {});
    }
}
exports.RedisEventStore = RedisEventStore;
