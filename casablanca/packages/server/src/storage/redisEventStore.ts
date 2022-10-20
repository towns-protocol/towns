import {
    Err,
    FullEvent,
    StreamAndCookie,
    StreamsAndCookies,
    SyncPos,
    throwWithCode,
} from '@zion/core'
import debug from 'debug'
import Redis from 'ioredis'
import _ from 'lodash'
import { config } from '../config'
import { EventStore } from './eventStore'

const log = debug('zion:RedisEventStore')

export const createRedis = () => new Redis(config.redisUrl)

const REDIS_STREAM_PREFIX = 'es:'

// TODO: change throws to throwWithCode
export class RedisEventStore implements EventStore {
    private redis: Redis
    private redisPoolInUse: Redis[] = []
    private redisPoolAvailable: Redis[] = []
    constructor(redis?: Redis) {
        this.redis = redis ?? createRedis()
    }

    async close(): Promise<void> {
        this.redis.disconnect()
        this.redisPoolInUse.forEach((redis) => redis.disconnect())
        this.redisPoolAvailable.forEach((redis) => redis.disconnect())
    }

    private getFromPool(): Redis {
        let ret: Redis
        if (this.redisPoolAvailable.length > 0) {
            ret = this.redisPoolAvailable.pop()!
        } else {
            ret = this.redis.duplicate()
        }

        this.redisPoolInUse.push(ret)
        return ret
    }

    private realeaseToPool(redis: Redis): void {
        _.pull(this.redisPoolInUse, redis)
        this.redisPoolAvailable.push(redis)
    }

    private async addEventsImpl(
        streamId: string,
        events: FullEvent[],
        newStream: boolean,
    ): Promise<string> {
        if (events.length <= 0) {
            throw new Error('Events must not be empty')
        }
        log('addEvents', 'streamId', streamId, 'events', events)
        const multi = this.redis.multi()
        const streamKey = REDIS_STREAM_PREFIX + streamId
        const noMk: string[] = newStream ? [] : ['NOMKSTREAM']
        events.forEach((event) => {
            multi.xadd(streamKey, ...noMk, '*', 'event', JSON.stringify(event))
        })
        const result = await multi.exec()
        if (result === null || result.length === 0) {
            throw new Error('Failed to add events')
        }
        return result[result.length - 1][1] as string
    }

    /**
     *
     * @param streamId
     * @param inceptionEvents
     * @returns sync cookie for reading new events from the stream
     */
    async createEventStream(streamId: string, inceptionEvents: FullEvent[]): Promise<string> {
        return this.addEventsImpl(streamId, inceptionEvents, true)
    }

    /**
     *
     * @param streamId
     * @param events
     * @returns sync cookie for reading new events from the stream
     */
    async addEvents(streamId: string, events: FullEvent[]): Promise<string> {
        return this.addEventsImpl(streamId, events, false)
    }

    async streamExists(streamId: string): Promise<boolean> {
        const ret = await this.redis.xrange(REDIS_STREAM_PREFIX + streamId, '-', '+', 'COUNT', 1)
        log('streamExists', streamId, 'ret', ret)
        return ret.length > 0
    }

    async getEventStream(streamId: string): Promise<StreamAndCookie> {
        const ret = await this.redis.xrange(REDIS_STREAM_PREFIX + streamId, '-', '+')
        log('getEventStream', streamId, 'ret', ret)
        if (ret.length <= 0) {
            throwWithCode('Stream not found', Err.STREAM_NOT_FOUND)
        }
        return {
            events: ret.map((item) => JSON.parse(item[1][1])),
            syncCookie: ret[ret.length - 1][0],
        }
    }

    private async callOnPool<FT extends (...args: any) => Promise<any>>(
        f: FT,
        ...args: Parameters<FT>
    ): Promise<Awaited<ReturnType<FT>>> {
        const anotherRedis = this.getFromPool()
        try {
            return await Reflect.apply(f, anotherRedis, args)
        } finally {
            this.realeaseToPool(anotherRedis)
        }
    }

    async readNewEvents(args: SyncPos[], timeousMs: number = 0): Promise<StreamsAndCookies> {
        if (args.length <= 0) {
            throw new Error('args must not be empty')
        }

        const streamIds = args.map((arg) => REDIS_STREAM_PREFIX + arg.streamId)
        const cookies = args.map((arg) => arg.syncCookie)

        log('readNewEvents', 'readArgs', ...streamIds, ...cookies)

        let ret: Awaited<ReturnType<Redis['xread']>>
        if (timeousMs > 0) {
            ret = await this.callOnPool(
                this.redis.xread,
                'COUNT',
                100,
                'BLOCK',
                timeousMs,
                'STREAMS',
                ...streamIds,
                ...cookies,
            )
        } else {
            ret = await this.redis.xread('COUNT', 100, 'STREAMS', ...streamIds, ...cookies)
        }

        if (ret === null || ret.length === 0) {
            log('readNewEvents', 'ret is null or empty')
            return {}
        }

        return ret.reduce((acc, item, i) => {
            log('readNewEvents', 'ret', i, item[0], item[1])
            const streamId = item[0].slice(REDIS_STREAM_PREFIX.length)
            const originalSyncCookie = args.find((arg) => arg.streamId === streamId)?.syncCookie
            let syncCookie = '0-0'
            const events = item[1].map((elem) => {
                syncCookie = elem[0]
                return JSON.parse(elem[1][1])
            })
            acc[streamId] = {
                events,
                syncCookie,
                originalSyncCookie,
            }
            return acc
        }, {} as StreamsAndCookies)
    }
}
