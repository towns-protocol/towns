import {
    isChannelStreamId,
    isSpaceStreamId,
    isUserDeviceStreamId,
    isUserSettingsStreamId,
    isUserStreamId,
    isUserInboxStreamId,
} from './id'
import { check, dlog, dlogError } from '@river-build/dlog'
import { Stream } from './stream'
import { ClientInitStatus } from './types'
import pLimit from 'p-limit'
import { datadogRum } from '@datadog/browser-rum'

interface StreamSyncItem {
    streamId: string
    priority: number
}

interface SyncedStreamsExtensionDelegate {
    startSyncStreams: () => Promise<void>
    initStream(streamId: string, allowGetStream: boolean): Promise<Stream>
    emitClientInitStatus: (status: ClientInitStatus) => void
}

const concurrencyLimit = pLimit(50)

export class SyncedStreamsExtension {
    private log = dlog('csb:syncedStreamsExtension')
    private logError = dlogError('csb:syncedStreamsExtension:error')
    private readonly delegate: SyncedStreamsExtensionDelegate

    private readonly tasks = new Array<() => Promise<void>>()
    private streamIds = new Set<string>()
    private highPriorityIds = new Set<string>()
    private started: boolean = false
    private inProgressTick?: Promise<void>
    private timeoutId?: NodeJS.Timeout
    private initStreamsStartTime = performance.now()

    private startSyncRequested = false
    private didLoadStreamsFromPersistence = false
    private streamCountRequiringNetworkAccess = 0
    private numStreamsLoadedFromCache = 0
    private numStreamsLoadedFromNetwork = 0
    private numStreamsFailedToLoad = 0
    private totalStreamCount = 0
    private loadedStreamCount = 0

    initStatus: ClientInitStatus = {
        isLocalDataLoaded: false,
        isRemoteDataLoaded: false,
        progress: 0,
    }

    constructor(delegate: SyncedStreamsExtensionDelegate) {
        this.delegate = delegate
    }

    public setStreamIds(streamIds: string[]) {
        check(this.streamIds.size === 0, 'setStreamIds called twice')
        this.streamIds = new Set(streamIds)
        this.totalStreamCount = streamIds.length
    }

    public setHighPriority(streamIds: string[]) {
        check(this.highPriorityIds.size === 0, 'setHighPriority called twice')
        this.highPriorityIds = new Set(streamIds)
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
        this.numStreamsLoadedFromCache = 0
        this.numStreamsLoadedFromNetwork = 0
        this.numStreamsFailedToLoad = 0

        this.tasks.push(() => this.loadHighPriorityStreams())
        this.tasks.push(() => this.loadStreamsFromPersistence())
        this.tasks.push(() => this.loadStreamsFromNetwork())

        this.checkStartTicking()
    }

    async stop() {
        await this.stopTicking()
    }

    private checkStartTicking() {
        if (!this.started || this.timeoutId) {
            return
        }

        // This means that we're finished. Ticking stops here.
        if (this.tasks.length === 0 && !this.startSyncRequested) {
            this.emitClientStatus()

            const initStreamsEndTime = performance.now()
            const executionTime = initStreamsEndTime - this.initStreamsStartTime

            datadogRum.addAction('streamInitializationDuration', {
                streamInitializationDuration: executionTime,
                streamsInitializedFromCache: this.numStreamsLoadedFromCache,
                streamsInitializedFromNetwork: this.numStreamsLoadedFromNetwork,
                streamsFailedToLoad: this.numStreamsFailedToLoad,
            })

            this.log('Streams loaded from cache', this.numStreamsLoadedFromCache)
            this.log('Streams loaded from network', this.numStreamsLoadedFromNetwork)
            this.log('Streams failed to load', this.numStreamsFailedToLoad)
            this.log(`Total time: ${executionTime.toFixed(0)} ms`)
            return
        }

        this.timeoutId = setTimeout(() => {
            this.inProgressTick = this.tick()
            this.inProgressTick
                .catch((e) => this.logError('ProcessTick Error', e))
                .finally(() => {
                    this.timeoutId = undefined
                    this.checkStartTicking()
                })
        }, 0)
    }

    private async loadHighPriorityStreams() {
        const streamIds = Array.from(this.highPriorityIds)
        await Promise.all(streamIds.map((streamId) => this.loadStreamFromPersistence(streamId)))
        this.emitClientStatus()
    }

    private async loadStreamsFromPersistence() {
        const syncItems = Array.from(this.streamIds).map((streamId) => {
            return {
                streamId,
                priority: this.priorityFromStreamId(streamId),
            } satisfies StreamSyncItem
        })
        syncItems.sort((a, b) => a.priority - b.priority)
        await Promise.all(syncItems.map((item) => this.loadStreamFromPersistence(item.streamId)))
        this.didLoadStreamsFromPersistence = true
        this.emitClientStatus()
    }

    private async loadStreamFromPersistence(streamId: string) {
        const allowGetStream = this.highPriorityIds.has(streamId)
        return concurrencyLimit(async () => {
            try {
                await this.delegate.initStream(streamId, allowGetStream)
                this.loadedStreamCount++
                this.numStreamsLoadedFromCache++
                this.streamIds.delete(streamId)
            } catch (err) {
                this.streamCountRequiringNetworkAccess++
                this.log('Error initializing stream from persistence', streamId, err)
            }
            this.emitClientStatus()
        })
    }

    private async loadStreamsFromNetwork() {
        const syncItems = Array.from(this.streamIds).map((streamId) => {
            return {
                streamId,
                priority: this.priorityFromStreamId(streamId),
            } satisfies StreamSyncItem
        })
        syncItems.sort((a, b) => a.priority - b.priority)
        await Promise.all(syncItems.map((item) => this.loadStreamFromNetwork(item.streamId)))
        this.emitClientStatus()
    }

    private async loadStreamFromNetwork(streamId: string) {
        this.log('Performance: adding stream from network', streamId)
        return concurrencyLimit(async () => {
            try {
                await this.delegate.initStream(streamId, true)
                this.numStreamsLoadedFromNetwork++
                this.streamIds.delete(streamId)
            } catch (err) {
                this.logError('Error initializing stream', streamId, err)
                this.log('Error initializing stream', streamId)
                this.numStreamsFailedToLoad++
            }
            this.loadedStreamCount++
            this.streamCountRequiringNetworkAccess--
            this.emitClientStatus()
        })
    }

    private async tick(): Promise<void> {
        const task = this.tasks.shift()
        if (task) {
            return task()
        }

        // Finish everything before starting sync
        if (this.startSyncRequested) {
            this.startSyncRequested = false
            return this.startSync()
        }
    }

    private async startSync() {
        try {
            await this.delegate.startSyncStreams()
        } catch (err) {
            this.logError('sync failure', err)
        }
    }

    private emitClientStatus() {
        this.initStatus.isLocalDataLoaded = this.didLoadStreamsFromPersistence
        this.initStatus.isRemoteDataLoaded =
            this.didLoadStreamsFromPersistence && this.streamCountRequiringNetworkAccess === 0
        if (this.totalStreamCount > 0) {
            this.initStatus.progress =
                (this.totalStreamCount - this.streamIds.size) / this.totalStreamCount
        }
        this.delegate.emitClientInitStatus(this.initStatus)
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
            isUserInboxStreamId(streamId) ||
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
