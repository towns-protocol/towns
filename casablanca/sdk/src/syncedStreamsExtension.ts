import {
    isChannelStreamId,
    isSpaceStreamId,
    isUserDeviceStreamId,
    isUserSettingsStreamId,
    isUserStreamId,
    isUserToDeviceStreamId,
} from './id'
import { check, dlog, dlogError } from '@river/waterproof'
import { Stream } from './stream'

interface StreamSyncItem {
    streamId: string
    priority: number
}

interface SyncedStreamsExtensionDelegate {
    startSyncStreams: () => Promise<void>
    initStream(streamId: string, allowGetStream: boolean): Promise<Stream>
    emitStreamSyncActive: (active: boolean) => void
}

const MAX_CACHED_STREAMS_PER_TICK = 50
const MAX_UNCACHED_STREAMS_PER_TICK = 10

export class SyncedStreamsExtension {
    private log = dlog('csb:syncedStreamsExtension')
    private logError = dlogError('csb:syncedStreamsExtension')
    private readonly delegate: SyncedStreamsExtensionDelegate
    private queue = new Array<StreamSyncItem>()
    private nonCachedQueue = new Array<StreamSyncItem>()
    private started: boolean = false
    private inProgressTick?: Promise<void>
    private timeoutId?: NodeJS.Timeout
    private highPriorityIds = new Set<string>()
    private startSyncRequested = false

    constructor(delegate: SyncedStreamsExtensionDelegate) {
        this.delegate = delegate
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
        this.highPriorityIds = new Set(streamIds)
        this.queue.sort((a, b) => a.priority - b.priority)
        this.checkStartTicking()
    }

    public setStartSyncRequested(startSyncRequested: boolean) {
        this.startSyncRequested = startSyncRequested
        if (startSyncRequested) {
            this.checkStartTicking()
        }
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

        if (
            this.queue.length === 0 &&
            this.nonCachedQueue.length === 0 &&
            !this.startSyncRequested
        ) {
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

    /*
    Ticking:
    - If there are high priority streams, prioritize them
    - If there are synced streams, add MAX_CACHED_STREAMS_PER_TICK of them
    - Start sync
    - For any remaining non-cached streams, add MAX_UNCACHED_STREAMS_PER_TICK of them
    */

    private async tick(): Promise<void> {
        if (this.queue.length > 0) {
            const items = this.queue.splice(0, MAX_CACHED_STREAMS_PER_TICK)
            this.log(
                'Performance: adding synced streams',
                items.map((item) => item.streamId),
            )

            // Allow downloading of high priority streams,
            // all other streams will only be loaded from persistence in this step
            await Promise.all(
                items.map(async (item) => {
                    try {
                        await this.delegate.initStream(
                            item.streamId,
                            this.highPriorityIds.has(item.streamId),
                        )
                    } catch (err) {
                        this.nonCachedQueue.push(item)
                    }
                }),
            )
        } else if (this.startSyncRequested) {
            this.startSyncRequested = false
            await this.startSync()
        } else if (this.nonCachedQueue.length > 0) {
            const items = this.nonCachedQueue.splice(0, MAX_UNCACHED_STREAMS_PER_TICK)
            this.log(
                'Performance: adding non-cached streams',
                items.map((item) => item.streamId),
            )
            await Promise.all(
                items.map(async (item) => {
                    try {
                        await this.delegate.initStream(item.streamId, true)
                    } catch (err) {
                        this.log('Error initializing stream', item.streamId)
                    }
                }),
            )
        }
    }

    private async startSync() {
        try {
            await this.delegate.startSyncStreams()
            this.delegate.emitStreamSyncActive(true)
        } catch (err) {
            this.logError('sync failure', err)
            this.delegate.emitStreamSyncActive(false)
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
                this.logError('ProcessTick Error while stopping', e)
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
        if (this.highPriorityIds.has(streamId)) {
            return 1
        }

        if (isSpaceStreamId(streamId)) {
            return 2
        }
        if (isChannelStreamId(streamId)) {
            return 3
        }
        return 4
    }
}
