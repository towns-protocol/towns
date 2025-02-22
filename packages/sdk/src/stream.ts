import { ChannelMessage, MembershipOp, Snapshot, SyncCookie } from '@river-build/proto'
import { DLogger } from '@river-build/dlog'
import EventEmitter from 'events'
import TypedEmitter from 'typed-emitter'
import { IStreamStateView, StreamStateView } from './streamStateView'
import { LocalEventStatus, ParsedEvent, ParsedMiniblock, isLocalEvent } from './types'
import { StreamEvents } from './streamEvents'
import { DecryptedContent } from './encryptedContentTypes'
import { DecryptionSessionError } from '@river-build/encryption'

export class Stream extends (EventEmitter as new () => TypedEmitter<StreamEvents>) {
    readonly clientEmitter: TypedEmitter<StreamEvents>
    readonly logEmitFromStream: DLogger
    readonly userId: string
    _view: StreamStateView
    get view(): IStreamStateView {
        return this._view
    }
    private stopped = false

    constructor(
        userId: string,
        streamId: string,
        clientEmitter: TypedEmitter<StreamEvents>,
        logEmitFromStream: DLogger,
    ) {
        super()
        this.clientEmitter = clientEmitter
        this.logEmitFromStream = logEmitFromStream
        this.userId = userId
        this._view = new StreamStateView(userId, streamId)
    }

    get streamId(): string {
        return this._view.streamId
    }

    get syncCookie(): SyncCookie | undefined {
        return this.view.syncCookie
    }

    /**
     * NOTE: Separating initial rollup from the constructor allows consumer to subscribe to events
     * on the new stream event and still access this object through Client.streams.
     */
    initialize(
        nextSyncCookie: SyncCookie,
        minipoolEvents: ParsedEvent[],
        snapshot: Snapshot,
        miniblocks: ParsedMiniblock[],
        prependedMiniblocks: ParsedMiniblock[],
        prevSnapshotMiniblockNum: bigint,
        cleartexts: Record<string, Uint8Array | string> | undefined,
    ): void {
        // grab any local events from the previous view that haven't been processed
        const localEvents = this._view.timeline
            .filter(isLocalEvent)
            .filter((e) => e.hashStr.startsWith('~'))
        this._view = new StreamStateView(this.userId, this.streamId)
        this._view.initialize(
            nextSyncCookie,
            minipoolEvents,
            snapshot,
            miniblocks,
            prependedMiniblocks,
            prevSnapshotMiniblockNum,
            cleartexts,
            localEvents,
            this,
        )
    }

    stop(): void {
        this.removeAllListeners()
        this.stopped = true
    }

    async appendEvents(
        events: ParsedEvent[],
        nextSyncCookie: SyncCookie,
        cleartexts: Record<string, Uint8Array | string> | undefined,
    ): Promise<void> {
        this._view.appendEvents(events, nextSyncCookie, cleartexts, this)
    }

    prependEvents(
        miniblocks: ParsedMiniblock[],
        cleartexts: Record<string, Uint8Array | string> | undefined,
        terminus: boolean,
    ) {
        this._view.prependEvents(miniblocks, cleartexts, terminus, this, this)
    }

    appendLocalEvent(channelMessage: ChannelMessage, status: LocalEventStatus) {
        return this._view.appendLocalEvent(channelMessage, status, this)
    }

    updateDecryptedContent(eventId: string, content: DecryptedContent) {
        return this._view.updateDecryptedContent(eventId, content, this)
    }

    updateDecryptedContentError(eventId: string, content: DecryptionSessionError) {
        return this._view.updateDecryptedContentError(eventId, content, this)
    }

    updateLocalEvent(localId: string, parsedEventHash: string, status: LocalEventStatus) {
        return this._view.updateLocalEvent(localId, parsedEventHash, status, this)
    }

    emit<E extends keyof StreamEvents>(event: E, ...args: Parameters<StreamEvents[E]>): boolean {
        if (this.stopped) {
            return false
        }
        this.logEmitFromStream(event, ...args)
        this.clientEmitter.emit(event, ...args)
        return super.emit(event, ...args)
    }

    /**
     * Memberships are processed on block boundaries, so we need to wait for the next block to be processed
     * passing an undefined userId will wait for the membership to be updated for the current user
     */
    public async waitForMembership(membership: MembershipOp, inUserId?: string) {
        // check to see if we're already in that state
        const userId = inUserId ?? this.userId
        // wait for a membership updated event, event, check again
        await this.waitFor('streamMembershipUpdated', () =>
            this._view.getMembers().isMember(membership, userId),
        )
    }

    /**
     * Wait for a stream event to be emitted
     * optionally pass a condition function to check the event args
     */
    public async waitFor<E extends keyof StreamEvents>(
        event: E,
        condition: () => boolean,
        opts: { timeoutMs: number } = { timeoutMs: 20000 },
    ): Promise<void> {
        if (condition()) {
            return
        }
        this.logEmitFromStream('waitFor', this.streamId, event)
        return new Promise((resolve, reject) => {
            // Set up the event listener
            const handler = (): void => {
                if (condition()) {
                    this.logEmitFromStream('waitFor success', this.streamId, event)
                    this.off(event, handler)
                    this.off('streamInitialized', handler)
                    clearTimeout(timeout)
                    resolve()
                }
            }

            const timeoutError = new Error(`waitFor timeout waiting for ${event}`)
            // Set up the timeout
            const timeout = setTimeout(() => {
                this.logEmitFromStream('waitFor timeout', this.streamId, event)
                this.off(event, handler)
                this.off('streamInitialized', handler)
                reject(timeoutError)
            }, opts.timeoutMs)

            this.on(event, handler)
            this.on('streamInitialized', handler)
        })
    }
}
