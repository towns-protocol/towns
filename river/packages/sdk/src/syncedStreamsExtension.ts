import {
    isChannelStreamId,
    isSpaceStreamId,
    isUserDeviceStreamId,
    isUserSettingsStreamId,
    isUserStreamId,
    isUserInboxStreamId,
    spaceIdFromChannelId,
    isDMChannelStreamId,
    isGDMChannelStreamId,
} from './id'
import { check, dlog, dlogError } from '@river-build/dlog'
import { Stream } from './stream'
import { ClientInitStatus } from './types'
import pLimit from 'p-limit'
import { IPersistenceStore, LoadedStream } from './persistenceStore'

interface StreamSyncItem {
    streamId: string
    priority: number
}

interface SyncedStreamsExtensionDelegate {
    startSyncStreams: () => Promise<void>
    initStream(
        streamId: string,
        allowGetStream: boolean,
        persistedData?: LoadedStream,
    ): Promise<Stream>
    emitClientInitStatus: (status: ClientInitStatus) => void
}

const concurrencyLimit = pLimit(20)

export class SyncedStreamsExtension {
    private log = dlog('csb:syncedStreamsExtension', { defaultEnabled: true })
    private logDebug = dlog('csb:syncedStreamsExtension:debug', { defaultEnabled: false })
    private logError = dlogError('csb:syncedStreamsExtension:error')
    private readonly delegate: SyncedStreamsExtensionDelegate

    private readonly tasks = new Array<() => Promise<void>>()
    private streamIds = new Set<string>()
    private highPriorityIds: Set<string>
    private started: boolean = false
    private inProgressTick?: Promise<void>
    private timeoutId?: NodeJS.Timeout
    private initStreamsStartTime = performance.now()

    private startSyncRequested = false
    private didLoadStreamsFromPersistence = false
    private didLoadHighPriorityStreams = false
    private streamCountRequiringNetworkAccess = 0
    private numStreamsLoadedFromCache = 0
    private numStreamsLoadedFromNetwork = 0
    private numStreamsFailedToLoad = 0
    private totalStreamCount = 0
    private loadedStreamCount = 0

    initStatus: ClientInitStatus = {
        isHighPriorityDataLoaded: false,
        isLocalDataLoaded: false,
        isRemoteDataLoaded: false,
        progress: 0,
    }

    constructor(
        highPriorityStreamIds: string[] | undefined,
        delegate: SyncedStreamsExtensionDelegate,
        private persistenceStore: IPersistenceStore,
    ) {
        this.highPriorityIds = new Set(highPriorityStreamIds ?? [])
        this.delegate = delegate
    }

    public setStreamIds(streamIds: string[]) {
        check(this.streamIds.size === 0, 'setStreamIds called twice')
        this.streamIds = new Set(streamIds)
        this.totalStreamCount = streamIds.length
    }

    public setHighPriorityStreams(streamIds: string[]) {
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

            this.log('streamInitializationDuration', {
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
                    setTimeout(() => this.checkStartTicking(), 0)
                })
        }, 0)
    }

    private async loadStreamsFromPersistence() {
        this.log('####loadingStreamsFromPersistence')
        const now = performance.now()
        // aellis it seems like it would be faster to pull the high priority streams first
        // then load the rest of the streams after, but it's not!
        // for 300ish streams,loading the rest of the streams after the application has started
        // going takes 30-50 seconds,doing it this way takes 4 seconds
        const loadedStreams = await this.persistenceStore.loadStreams([
            ...Array.from(this.highPriorityIds),
            ...Array.from(this.streamIds),
        ])
        const t1 = performance.now()
        this.log('####Performance: loaded streams from persistence!!', t1 - now)

        let streamIds = Array.from(this.highPriorityIds)
        await Promise.all(
            streamIds.map((streamId) =>
                this.loadStreamFromPersistence(streamId, loadedStreams[streamId]),
            ),
        )
        this.didLoadHighPriorityStreams = true
        this.emitClientStatus()
        // wait for 10ms to allow the client to update the status
        await new Promise((resolve) => setTimeout(resolve, 10))
        const t2 = performance.now()
        this.log('####Performance: loadedHighPriorityStreams!!', t2 - t1)
        streamIds = Array.from(this.streamIds).toSorted(
            (a, b) =>
                priorityFromStreamId(a, this.highPriorityIds) -
                priorityFromStreamId(b, this.highPriorityIds),
        )
        // because of how concurrency limit works, resort the streams on every iteration of the loop
        // to allow for updates to the priority of the streams
        while (streamIds.length > 0) {
            const item = streamIds.shift()!
            //this.log('Performance: loading stream from persistence', item)
            await this.loadStreamFromPersistence(item, loadedStreams[item])
        }
        const t3 = performance.now()
        this.log('####Performance: loadedLowPriorityStreams!!', t3 - t2, 'total:', t3 - now)
        this.didLoadStreamsFromPersistence = true
        this.emitClientStatus()
    }

    private async loadStreamFromPersistence(
        streamId: string,
        persistedData: LoadedStream | undefined,
    ) {
        const allowGetStream = this.highPriorityIds.has(streamId)
        await concurrencyLimit(async () => {
            try {
                await this.delegate.initStream(streamId, allowGetStream, persistedData)
                this.loadedStreamCount++
                this.numStreamsLoadedFromCache++
                this.streamIds.delete(streamId)
            } catch (err) {
                this.streamCountRequiringNetworkAccess++
                this.logError('Error initializing stream from persistence', streamId, err)
            }
            this.emitClientStatus()
        })
    }

    private async loadStreamsFromNetwork() {
        const syncItems = Array.from(this.streamIds).map((streamId) => {
            return {
                streamId,
                priority: priorityFromStreamId(streamId, this.highPriorityIds),
            } satisfies StreamSyncItem
        })
        syncItems.sort((a, b) => a.priority - b.priority)
        await Promise.all(syncItems.map((item) => this.loadStreamFromNetwork(item.streamId)))
        this.emitClientStatus()
    }

    private async loadStreamFromNetwork(streamId: string) {
        this.logDebug('Performance: adding stream from network', streamId)
        return concurrencyLimit(async () => {
            try {
                await this.delegate.initStream(streamId, true)
                this.numStreamsLoadedFromNetwork++
                this.streamIds.delete(streamId)
            } catch (err) {
                this.logError('Error initializing stream', streamId, err)
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
        this.initStatus.isHighPriorityDataLoaded = this.didLoadHighPriorityStreams
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
}

// priority from stream id for loading, we need spaces to structure the app, dms if that's what we're looking at
// and channels for any high priority spaces
function priorityFromStreamId(streamId: string, highPriorityIds: Set<string>) {
    if (
        isUserDeviceStreamId(streamId) ||
        isUserInboxStreamId(streamId) ||
        isUserStreamId(streamId) ||
        isUserSettingsStreamId(streamId)
    ) {
        return 0
    }
    if (highPriorityIds.has(streamId)) {
        return 1
    }
    // if we're prioritizing dms, load other dms and gdm channels
    if (highPriorityIds.size > 0) {
        const firstHPI = Array.from(highPriorityIds.values())[0]
        if (isDMChannelStreamId(firstHPI) || isGDMChannelStreamId(firstHPI)) {
            if (isDMChannelStreamId(streamId) || isGDMChannelStreamId(streamId)) {
                return 2
            }
        }
    }

    // we need spaces to structure the app
    if (isSpaceStreamId(streamId)) {
        return 3
    }

    if (isChannelStreamId(streamId)) {
        const spaceId = spaceIdFromChannelId(streamId)
        if (highPriorityIds.has(spaceId)) {
            return 4
        } else {
            return 5
        }
    }
    return 6
}
