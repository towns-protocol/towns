import { MembershipOp, Snapshot, SyncCookie } from '@river-build/proto'
import { DLogger } from '@river-build/dlog'
import EventEmitter from 'events'
import TypedEmitter from 'typed-emitter'
import { StreamStateView } from './streamStateView'
import { ParsedEvent, ParsedMiniblock, isLocalEvent } from './types'
import { StreamEvents } from './streamEvents'

export class Stream extends (EventEmitter as new () => TypedEmitter<StreamEvents>) {
    readonly clientEmitter: TypedEmitter<StreamEvents>
    readonly logEmitFromStream: DLogger
    readonly userId: string
    view: StreamStateView
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
        this.view = new StreamStateView(userId, streamId)
    }

    get streamId(): string {
        return this.view.streamId
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
        cleartexts: Record<string, string> | undefined,
    ): void {
        // grab any local events from the previous view that haven't been processed
        const localEvents = this.view.timeline
            .filter(isLocalEvent)
            .filter((e) => e.hashStr.startsWith('~'))
        this.view = new StreamStateView(this.userId, this.streamId)
        this.view.initialize(
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
        cleartexts: Record<string, string> | undefined,
    ): Promise<void> {
        this.view.appendEvents(events, nextSyncCookie, cleartexts, this)
    }

    prependEvents(
        miniblocks: ParsedMiniblock[],
        cleartexts: Record<string, string> | undefined,
        terminus: boolean,
    ) {
        this.view.prependEvents(miniblocks, cleartexts, terminus, this, this)
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
    public async waitForMembership(membership: MembershipOp, userId?: string) {
        // check to see if we're already in that state
        if (this.view.getMembers().isMember(membership, userId ?? this.userId)) {
            return
        }
        // wait for a membership updated event, event, check again
        await this.waitFor('streamMembershipUpdated', (_streamId: string, iUserId: string) => {
            return (
                (userId === undefined || userId === iUserId) &&
                this.view.getMembers().isMember(membership, userId ?? this.userId)
            )
        })
    }

    /**
     * Wait for a stream event to be emitted
     * optionally pass a condition function to check the event args
     */
    public async waitFor<E extends keyof StreamEvents>(
        event: E,
        fn?: (...args: Parameters<StreamEvents[E]>) => boolean,
        opts: { timeoutMs: number } = { timeoutMs: 20000 },
    ): Promise<void> {
        this.logEmitFromStream('waitFor', this.streamId, event)
        return new Promise((resolve, reject) => {
            // Set up the event listener
            const handler = (...args: Parameters<StreamEvents[E]>): void => {
                if (!fn || fn(...args)) {
                    this.logEmitFromStream('waitFor success', this.streamId, event)
                    this.off(event, handler as StreamEvents[E])
                    clearTimeout(timeout)
                    resolve()
                }
            }

            // Set up the timeout
            const timeout = setTimeout(() => {
                this.logEmitFromStream('waitFor timeout', this.streamId, event)
                this.off(event, handler as StreamEvents[E])
                reject(new Error(`Timed out waiting for event: ${event}`))
            }, opts.timeoutMs)

            this.on(event, handler as StreamEvents[E])
        })
    }
}
