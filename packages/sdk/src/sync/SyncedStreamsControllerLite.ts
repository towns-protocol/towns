import { dlog, dlogError, DLogger } from '@towns-protocol/utils'
import { IPersistenceStore } from '../persistenceStore'
import { ClientInitStatus } from '../types'
import {
    ISyncedStreamsController,
    SyncedStreamsControllerDelegate,
} from './ISyncedStreamsController'
import { isSpaceStreamId, spaceIdFromChannelId, StreamPrefix } from '../id'
import { isEqual } from 'lodash-es'

// only loads high priority streams, and starts sync when all high priority streams are loaded
export class SyncedStreamsControllerLite implements ISyncedStreamsController {
    initStatus: ClientInitStatus
    private log: DLogger
    private logDebug: DLogger
    private logError: DLogger
    private started = false
    private syncStarted = false
    private highPriorityIds: Set<string>
    private favoriteStreamIds: Set<string>
    private loadedStreamIds = new Set<string>()
    private inProgressTick?: Promise<void>
    private allStreamIds: string[] = []
    private lastAccessedAt: Record<string, number> | undefined
    private foundGod = false

    constructor(
        highPriorityStreamIds: string[] | undefined,
        private readonly delegate: SyncedStreamsControllerDelegate,
        private readonly persistenceStore: IPersistenceStore,
        logId: string,
    ) {
        this.initStatus = {
            isHighPriorityDataLoaded: false,
            isLocalDataLoaded: false,
            isRemoteDataLoaded: false,
            progress: 0,
        }
        this.log = dlog('csb:syncedStreamsExtensionLite', { defaultEnabled: true }).extend(logId)
        this.logDebug = dlog('csb:syncedStreamsExtensionLite:debug', {
            defaultEnabled: false,
        }).extend(logId)
        this.logError = dlogError('csb:syncedStreamsExtensionLite:error').extend(logId)
        this.log('constructor', highPriorityStreamIds)
        this.favoriteStreamIds = new Set(highPriorityStreamIds ?? [])
        this.highPriorityIds = new Set()
    }

    async stop(): Promise<void> {
        this.started = false
        if (this.inProgressTick) {
            try {
                await this.inProgressTick
            } catch (e) {
                this.logError('ProcessTick Error while stopping', e)
            }
        }
    }

    setStreamIds(streamIds: string[]): void {
        this.allStreamIds = streamIds
        this.foundGod = false
    }

    setHighPriorityStreams(streamIds: string[]): void {
        this.log('setHighPriorityStreams', streamIds)
        if (this.lastAccessedAt) {
            streamIds.forEach((streamId) => {
                this.lastAccessedAt![streamId] = Date.now()
            })
        }
        this.highPriorityIds = new Set(streamIds)
        this.foundGod = false
        this.sortStreams()
        this.checkStartTicking()
    }

    setStartSyncRequested(_startSyncRequested: boolean): void {
        // do nothing
    }

    start(): void {
        this.started = true
        this.checkStartTicking()
    }

    private sortStreams() {
        if (!this.lastAccessedAt) {
            return
        }
        this.allStreamIds.sort((a, b) => {
            const aDate = this.lastAccessedAt![a] ?? 0
            const bDate = this.lastAccessedAt![b] ?? 0
            return bDate - aDate
        })
    }

    private checkStartTicking() {
        if (!this.started) {
            return
        }
        if (this.inProgressTick != undefined) {
            return
        }
        if (this.foundGod) {
            return
        }
        // capture the loadStreams promise, on complete, schedule a new tick
        this.inProgressTick = this.tick()
        this.inProgressTick
            .catch((err) => {
                this.logError('Error loading streams', err)
            })
            .finally(() => {
                this.inProgressTick = undefined
                setTimeout(() => this.checkStartTicking(), 0)
            })
    }

    private async tick(): Promise<void> {
        const newStreamIds = Array.from(
            this.highPriorityIds.union(this.favoriteStreamIds).difference(this.loadedStreamIds),
        )
        this.logDebug(
            'loading newStreamIds',
            newStreamIds,
            this.highPriorityIds,
            this.favoriteStreamIds,
        )
        if (newStreamIds.length > 0) {
            this.logDebug('loading streams', newStreamIds)
            const { streams: loadedStreams, lastAccessedAt } =
                await this.persistenceStore.loadStreams(newStreamIds)

            this.lastAccessedAt = lastAccessedAt
            this.sortStreams()

            for (const streamId of newStreamIds) {
                try {
                    await this.delegate.initStream(streamId, true, loadedStreams[streamId])
                    this.loadedStreamIds.add(streamId)
                } catch (err) {
                    this.logError('Error initializing stream', streamId, err)
                }
            }
        } else if (this.lastAccessedAt === undefined) {
            const { lastAccessedAt } = await this.persistenceStore.loadStreams([])
            this.lastAccessedAt = lastAccessedAt
            this.sortStreams()
        } else {
            const spaceStreamIds = new Set(Array.from(this.highPriorityIds).filter(isSpaceStreamId))
            const pendingStreamIds = this.allStreamIds.filter((x) => !this.loadedStreamIds.has(x))
            // load one channel stream at a time for the space you're currently looking at
            const didLoadStream = await this.loadStream(spaceStreamIds, pendingStreamIds)
            if (!didLoadStream) {
                this.log('sync complete')
                this.foundGod = true
            }
        }

        if (!this.syncStarted && this.loadedStreamIds.size > 0) {
            this.syncStarted = true
            this.log('starting sync')
            await this.delegate.startSyncStreams(this.lastAccessedAt)
        }
        this.emitClientInitStatus()
    }

    private async loadStream(spaceStreamIds: Set<string>, pendingStreamIds: string[]) {
        for (const streamId of pendingStreamIds) {
            if (
                (streamId.startsWith(StreamPrefix.Channel) &&
                    spaceStreamIds.has(spaceIdFromChannelId(streamId))) ||
                streamId.startsWith(StreamPrefix.GDM) ||
                streamId.startsWith(StreamPrefix.DM)
            ) {
                try {
                    this.log('loading stream', streamId)
                    const data = await this.persistenceStore.loadStream(streamId)
                    await this.delegate.initStream(streamId, true, data)
                } catch (err) {
                    this.logError('Error loading channel stream', streamId, err)
                } finally {
                    this.loadedStreamIds.add(streamId)
                }
                return true // only load one channel stream at a time
            }
        }
        return false
    }

    private emitClientInitStatus() {
        const highPriorityLeft = this.highPriorityIds.difference(this.loadedStreamIds).size
        const newStatus = {
            isHighPriorityDataLoaded: highPriorityLeft === 0,
            isLocalDataLoaded: !this.foundGod,
            isRemoteDataLoaded: !this.foundGod,
            progress:
                this.highPriorityIds.size > 0
                    ? this.highPriorityIds.size - highPriorityLeft / this.highPriorityIds.size
                    : 0,
        }

        if (!isEqual(this.initStatus, newStatus)) {
            this.initStatus = newStatus
            this.delegate.emitClientInitStatus(this.initStatus)
        }
    }
}
