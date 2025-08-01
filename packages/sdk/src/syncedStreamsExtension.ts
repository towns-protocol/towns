import { spaceIdFromChannelId, StreamPrefix } from './id'
import { check, dlog, dlogError, DLogger } from '@towns-protocol/dlog'
import { ClientInitStatus } from './types'
import pLimit from 'p-limit'
import { IPersistenceStore, LoadedStream } from './persistenceStore'
import {
    ISyncedStreamsController,
    SyncedStreamsControllerDelegate,
} from './sync/ISyncedStreamsController'

interface StreamSyncItem {
    streamId: string
    priority: number
}

const MAX_CONCURRENT_FROM_PERSISTENCE = 10
const MAX_CONCURRENT_FROM_NETWORK = 20
const concurrencyLimit = pLimit(MAX_CONCURRENT_FROM_NETWORK)

export class SyncedStreamsExtension implements ISyncedStreamsController {
    private log: DLogger
    private logDebug: DLogger
    private logError: DLogger
    private readonly delegate: SyncedStreamsControllerDelegate

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
        delegate: SyncedStreamsControllerDelegate,
        private persistenceStore: IPersistenceStore,
        private logId: string,
    ) {
        this.log = dlog('csb:syncedStreamsExtension', { defaultEnabled: true }).extend(logId)
        this.logDebug = dlog('csb:syncedStreamsExtension:debug', { defaultEnabled: false }).extend(
            logId,
        )
        this.logError = dlogError('csb:syncedStreamsExtension:error').extend(logId)
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

    private lastLogInflightAt = 0
    private async loadStreamsFromPersistence() {
        this.log('####loadingStreamsFromPersistence')
        const now = performance.now()
        // aellis it seems like it would be faster to pull the high priority streams first
        // then load the rest of the streams after, but it's not!
        // for 300ish streams,loading the rest of the streams after the application has started
        // going takes 30-50 seconds,doing it this way takes 4 seconds
        const { streams: loadedStreams, lastAccessedAt } = await this.persistenceStore.loadStreams(
            Array.from(this.highPriorityIds),
        )
        const t1 = performance.now()
        this.log('####Performance: loaded streams from persistence!!', t1 - now)

        const hpStreamIds = Array.from(this.highPriorityIds).filter(
            (x) => loadedStreams[x] !== undefined,
        )
        await Promise.all(
            hpStreamIds.map(async (streamId) => {
                await this.loadStreamFromPersistence(streamId, loadedStreams[streamId])
                delete loadedStreams[streamId]
            }),
        )
        this.didLoadHighPriorityStreams = true
        this.emitClientStatus()
        // wait for 10ms to allow the client to update the status
        const t2 = performance.now()
        this.log('####Performance: loadedHighPriorityStreams!!', t2 - t1)
        await this.startSync(lastAccessedAt)
        // this is real goofy, it makes the app smooth
        // push on a final task to update the client status and report stats
        this.tasks.unshift(async () => {
            const t3 = performance.now()
            this.log('####Performance: loadedLowPriorityStreams!!', t3 - t2, 'total:', t3 - now)
            this.didLoadStreamsFromPersistence = true
            this.emitClientStatus()
        })
        // freeze the remaining stream ids
        const streamIds = Array.from(this.streamIds)
        // make a step task that will load the next batch of streams
        const stepTask = async () => {
            if (streamIds.length === 0) {
                return
            }
            // it sorts and slices the array
            const streamIdsForStep = streamIds
                .sort((a, b) => {
                    const aPriority = priorityFromStreamId(a, this.highPriorityIds)
                    const bPriority = priorityFromStreamId(b, this.highPriorityIds)
                    if (aPriority === bPriority) {
                        const aLastAccessedAt = lastAccessedAt[a] ?? 0
                        const bLastAccessedAt = lastAccessedAt[b] ?? 0
                        return bLastAccessedAt - aLastAccessedAt
                    }
                    return aPriority - bPriority
                })
                .splice(0, MAX_CONCURRENT_FROM_PERSISTENCE)
            const { streams: loadedStreams } =
                await this.persistenceStore.loadStreams(streamIdsForStep)
            // and then loads MAX_CONCURRENT_STREAMS streams
            await Promise.all(
                streamIdsForStep.map(async (streamId) => {
                    await this.loadStreamFromPersistence(streamId, loadedStreams[streamId])
                    delete loadedStreams[streamId]
                }),
            )
            if (performance.now() - this.lastLogInflightAt > 5000) {
                this.log(`####loading streams from persistence remaining: ${streamIds.length}`)
                this.lastLogInflightAt = performance.now()
            }
            // do the next few
            this.tasks.unshift(stepTask)
        }
        // push on the step task as the next task to run
        this.tasks.unshift(stepTask)
    }

    private async loadStreamFromPersistence(
        streamId: string,
        persistedData: LoadedStream | undefined,
    ) {
        const allowGetStream = this.highPriorityIds.has(streamId)
        if (persistedData === undefined && !allowGetStream) {
            this.streamCountRequiringNetworkAccess++
        } else {
            try {
                await this.delegate.initStream(streamId, allowGetStream, persistedData)
                this.loadedStreamCount++
                this.numStreamsLoadedFromCache++
                this.streamIds.delete(streamId)
            } catch (err) {
                this.streamCountRequiringNetworkAccess++
                this.logError('Error initializing stream from persistence', streamId, err)
            }
        }
        this.emitClientStatus()
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
    }

    private async startSync(lastAccessedAt: Record<string, number>) {
        try {
            await this.delegate.startSyncStreams(lastAccessedAt)
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
        streamId.startsWith(StreamPrefix.UserMetadata) ||
        streamId.startsWith(StreamPrefix.UserInbox) ||
        streamId.startsWith(StreamPrefix.User) ||
        streamId.startsWith(StreamPrefix.UserSettings)
    ) {
        return 0
    }
    if (highPriorityIds.has(streamId)) {
        return 1
    }
    // if we're prioritizing dms, load other dms and gdm channels
    if (highPriorityIds.size > 0) {
        const hasHighPriorityDmORGDm = Array.from(highPriorityIds).some(
            (x) => x.startsWith(StreamPrefix.DM) || x.startsWith(StreamPrefix.GDM),
        )
        if (hasHighPriorityDmORGDm) {
            if (streamId.startsWith(StreamPrefix.DM) || streamId.startsWith(StreamPrefix.GDM)) {
                return 2
            }
        }
    }

    if (streamId.startsWith(StreamPrefix.Channel)) {
        const spaceId = spaceIdFromChannelId(streamId)
        if (highPriorityIds.has(spaceId)) {
            return 4
        }
    }

    if (streamId.startsWith(StreamPrefix.DM) || streamId.startsWith(StreamPrefix.GDM)) {
        return 4
    }

    // we need spaces to structure the app
    if (streamId.startsWith(StreamPrefix.Space)) {
        return 5
    }

    return 6
}
