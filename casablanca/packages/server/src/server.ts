import {
    ActionGuard,
    AddEventParam,
    AddEventResult,
    CreateEventStreamParams,
    CreateEventStreamResult,
    GetEventStreamParams,
    GetEventStreamResult,
    SyncStreamsParams,
    SyncStreamsResult,
    ZionServiceInterface,
} from '@zion/core'
import { Wallet } from 'ethers'
import { RedisEventStore } from './redisEventStore'
import { addEvent } from './workflows/addEvent'
import { createChannel } from './workflows/createChannel'
import { createSpace } from './workflows/createSpace'
import { createUser } from './workflows/createUser'

export class ZionServer implements ZionServiceInterface {
    constructor(
        readonly wallet: Wallet,
        readonly store: RedisEventStore,
        readonly actionGuard: ActionGuard,
    ) {}

    get address(): string {
        return this.wallet.address
    }

    createUser(params: CreateEventStreamParams): Promise<CreateEventStreamResult> {
        return createUser(this, params)
    }

    createSpace(params: CreateEventStreamParams): Promise<CreateEventStreamResult> {
        return createSpace(this, params)
    }

    createChannel(params: CreateEventStreamParams): Promise<CreateEventStreamResult> {
        return createChannel(this, params)
    }

    async getEventStream(params: GetEventStreamParams): Promise<GetEventStreamResult> {
        return this.store.getEventStream(params.streamId)
    }

    async addEvent(params: AddEventParam): Promise<AddEventResult> {
        return addEvent(this, params)
    }

    async syncStreams(params: SyncStreamsParams): Promise<SyncStreamsResult> {
        return { streams: await this.store.readNewEvents(params.syncPositions, params.timeoutMs) }
    }
}
