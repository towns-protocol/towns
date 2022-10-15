import { FullEvent, StreamAndCookie, StreamsAndCookies, SyncPos } from '@zion/core';
import Redis from 'ioredis';
export declare const createRedis: () => Redis;
export declare class RedisEventStore {
    private redis;
    private redisPoolInUse;
    private redisPoolAvailable;
    constructor(redis?: Redis);
    close(): Promise<void>;
    private getFromPool;
    private realeaseToPool;
    private addEventsImpl;
    /**
     *
     * @param streamId
     * @param inceptionEvents
     * @returns sync cookie for reading new events from the stream
     */
    createEventStream(streamId: string, inceptionEvents: FullEvent[]): Promise<string>;
    /**
     *
     * @param streamId
     * @param events
     * @returns sync cookie for reading new events from the stream
     */
    addEvents(streamId: string, events: FullEvent[]): Promise<string>;
    streamExists(streamId: string): Promise<boolean>;
    getEventStream(streamId: string): Promise<StreamAndCookie>;
    private callOnPool;
    readNewEvents(args: SyncPos[], timeousMs?: number): Promise<StreamsAndCookies>;
}
//# sourceMappingURL=redisEventStore.d.ts.map