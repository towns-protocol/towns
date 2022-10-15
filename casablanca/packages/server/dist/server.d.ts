import { ActionGuard, AddEventParam, AddEventResult, CreateEventStreamParams, CreateEventStreamResult, GetEventStreamParams, GetEventStreamResult, SyncStreamsParams, SyncStreamsResult, ZionServiceInterface } from '@zion/core';
import { Wallet } from 'ethers';
import { RedisEventStore } from './redisEventStore';
export declare class ZionServer implements ZionServiceInterface {
    readonly wallet: Wallet;
    readonly store: RedisEventStore;
    readonly actionGuard: ActionGuard;
    constructor(wallet: Wallet, store: RedisEventStore, actionGuard: ActionGuard);
    get address(): string;
    createUser(params: CreateEventStreamParams): Promise<CreateEventStreamResult>;
    createSpace(params: CreateEventStreamParams): Promise<CreateEventStreamResult>;
    createChannel(params: CreateEventStreamParams): Promise<CreateEventStreamResult>;
    getEventStream(params: GetEventStreamParams): Promise<GetEventStreamResult>;
    addEvent(params: AddEventParam): Promise<AddEventResult>;
    syncStreams(params: SyncStreamsParams): Promise<SyncStreamsResult>;
}
//# sourceMappingURL=server.d.ts.map