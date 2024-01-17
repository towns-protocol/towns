import { Client } from './client'
import {
    isDMChannelStreamId,
    isGDMChannelStreamId,
    isSpaceStreamId,
    isUserDeviceStreamId,
    isUserSettingsStreamId,
    isUserStreamId,
    isUserToDeviceStreamId,
} from './id'
import { check, dlog, dlogError } from '@river/mecholm'

interface StreamSyncItem {
    streamId: string
    priority: number
}

const MAX_STREAMS_PER_TICK = 10
export class SyncedStreamsExtension {
    private log = dlog('csb:syncedStreamsExtension')
    private errorLog = dlogError('csb:syncedStreamsExtension')
    private readonly client: Client
    private queue = new Array<StreamSyncItem>()
    private started: boolean = false
    private inProgressTick?: Promise<void>
    private timeoutId?: NodeJS.Timeout
    private highPriorityQueue = new Array<string>()

    constructor(client: Client) {
        this.client = client
    }

    public addStream(streamId: string) {
        const item = {
            streamId,
            priority: this.priorityFromStreamId(streamId),
        } satisfies StreamSyncItem
        this.queue.push(item)
        this.queue.sort((a, b) => a.priority - b.priority)
        this.checkStartTicking()
    }

    public setHighPriority(streamIds: string[]) {
        this.highPriorityQueue = streamIds
        this.queue = this.queue.filter((item) => !streamIds.includes(item.streamId))
        this.checkStartTicking()
    }

    start() {
        check(!this.started, 'start() called twice')
        this.started = true
        this.checkStartTicking()
    }

    async stop() {
        await this.stopTicking()
    }

    private checkStartTicking() {
        if (!this.started || this.timeoutId) {
            return
        }

        if (this.queue.length === 0 && this.highPriorityQueue.length === 0) {
            return
        }

        this.timeoutId = setTimeout(() => {
            this.inProgressTick = this.tick()
            this.inProgressTick
                .catch((e) => this.log('ProcessTick Error', e))
                .finally(() => {
                    this.timeoutId = undefined
                    this.checkStartTicking()
                })
        }, 0)
    }

    private async tick(): Promise<void> {
        if (this.highPriorityQueue.length > 0) {
            this.log('Performance: adding high priority streams', this.highPriorityQueue)
            await Promise.all(this.highPriorityQueue.map((streamId) => this.initStream(streamId)))
            this.highPriorityQueue = []
        }

        const items = this.queue.splice(0, MAX_STREAMS_PER_TICK)
        this.log(
            'Performance: adding synced streams',
            items.map((item) => item.streamId),
        )
        await Promise.all(items.map((item) => this.initStream(item.streamId)))
    }

    async initStream(streamId: string) {
        // Try-catch stream init to avoid all streams being blocked by a single stream
        try {
            await this.client.initStream(streamId)
        } catch (e) {
            this.log('Error initializing stream', streamId)
        }
    }

    private async stopTicking() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId)
            this.timeoutId = undefined
        }
        if (this.inProgressTick) {
            try {
                await this.inProgressTick
            } catch (e) {
                this.errorLog('ProcessTick Error while stopping', e)
            } finally {
                this.inProgressTick = undefined
            }
        }
    }

    private priorityFromStreamId(streamId: string) {
        if (
            isUserDeviceStreamId(streamId) ||
            isUserToDeviceStreamId(streamId) ||
            isUserStreamId(streamId) ||
            isUserSettingsStreamId(streamId)
        ) {
            return 0
        }
        if (isSpaceStreamId(streamId)) {
            return 1
        }
        if (isDMChannelStreamId(streamId) || isGDMChannelStreamId(streamId)) {
            return 2
        }
        return 3
    }
}
