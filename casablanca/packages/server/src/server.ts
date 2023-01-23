import {
    ActionGuard,
    AddEventParam,
    AddEventResult,
    CreateEventStreamParams,
    CreateEventStreamResult,
    GetEventStreamParams,
    GetEventStreamResult,
    SignerContext,
    SyncStreamsParams,
    StreamExistsParams,
    SyncStreamsResult,
    ZionServiceInterface,
} from '@zion/core'
import { Wallet } from 'ethers'
import { EventStore } from './storage/eventStore'
import { addEvent } from './workflows/addEvent'
import { createChannel } from './workflows/createChannel'
import { createSpace } from './workflows/createSpace'
import { createUser } from './workflows/createUser'

export class ZionServer implements ZionServiceInterface {
    constructor(
        readonly signerContext: SignerContext,
        readonly store: EventStore,
        readonly actionGuard: ActionGuard,
    ) {}

    get address(): string {
        return this.signerContext.creatorAddress
    }

    async createUser(params: CreateEventStreamParams): Promise<CreateEventStreamResult> {
        return createUser(this, params)
    }

    async createSpace(params: CreateEventStreamParams): Promise<CreateEventStreamResult> {
        return createSpace(this, params)
    }

    async createChannel(params: CreateEventStreamParams): Promise<CreateEventStreamResult> {
        return createChannel(this, params)
    }

    async getEventStream(params: GetEventStreamParams): Promise<GetEventStreamResult> {
        return this.store.getEventStream(params.streamId)
    }

    async addEvent(params: AddEventParam): Promise<AddEventResult> {
        return addEvent(this, params)
    }

    async syncStreams(params: SyncStreamsParams): Promise<SyncStreamsResult> {
        return {
            streams: await this.store.readNewEvents(params.syncPositions, params.timeoutMs || 0),
        }
    }

    async streamExists(params: StreamExistsParams): Promise<boolean> {
        return await this.store.streamExists(params.streamId)
    }
}
