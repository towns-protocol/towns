import { MembershipOp, Snapshot } from '@river/proto'

import { DLogger } from '@river/mecholm'
import EventEmitter from 'events'
import TypedEmitter from 'typed-emitter'
import { StreamStateView } from './streamStateView'
import { EmittedEvents } from './client'
import { ParsedMiniblock, ParsedStreamAndCookie } from './types'

export class Stream extends (EventEmitter as new () => TypedEmitter<EmittedEvents>) {
    readonly clientEmitter: TypedEmitter<EmittedEvents>
    readonly logEmitFromStream: DLogger
    readonly view: StreamStateView

    constructor(
        userId: string,
        streamId: string,
        clientEmitter: TypedEmitter<EmittedEvents>,
        logEmitFromStream: DLogger,
    ) {
        super()
        this.clientEmitter = clientEmitter
        this.logEmitFromStream = logEmitFromStream
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
        streamAndCookie: ParsedStreamAndCookie,
        snapshot: Snapshot,
        miniblocks: ParsedMiniblock[],
        prevSnapshotMiniblockNum: bigint,
        cleartexts: Record<string, string> | undefined,
    ): void {
        this.view.initialize(
            streamAndCookie,
            snapshot,
            miniblocks,
            prevSnapshotMiniblockNum,
            cleartexts,
            this,
        )
    }

    appendEvents(
        streamAndCookie: ParsedStreamAndCookie,
        cleartexts: Record<string, string> | undefined,
    ): void {
        this.view.appendEvents(streamAndCookie, cleartexts, this)
    }

    prependEvents(
        miniblocks: ParsedMiniblock[],
        cleartexts: Record<string, string> | undefined,
        terminus: boolean,
    ) {
        this.view.prependEvents(miniblocks, cleartexts, terminus, this)
    }

    emit<E extends keyof EmittedEvents>(event: E, ...args: Parameters<EmittedEvents[E]>): boolean {
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
        if (this.view.getMemberships().isMember(membership, userId)) {
            return
        }
        // wait for a membership updated event, event, check again
        await this.waitFor('streamMembershipUpdated', (_streamId: string, iUserId: string) => {
            return (
                (userId === undefined || userId === iUserId) &&
                this.view.getMemberships().isMember(membership, userId)
            )
        })
    }

    /**
     * Wait for a stream event to be emitted
     * optionally pass a condition function to check the event args
     */
    public async waitFor<E extends keyof EmittedEvents>(
        event: E,
        fn?: (...args: Parameters<EmittedEvents[E]>) => boolean,
        opts: { timeoutMs: number } = { timeoutMs: 10000 },
    ): Promise<void> {
        this.logEmitFromStream('waitFor', this.streamId, event)
        return new Promise((resolve, reject) => {
            // Set up the event listener
            const handler = (...args: Parameters<EmittedEvents[E]>): void => {
                if (!fn || fn(...args)) {
                    this.logEmitFromStream('waitFor success', this.streamId, event)
                    this.off(event, handler as EmittedEvents[E])
                    clearTimeout(timeout)
                    resolve()
                }
            }

            // Set up the timeout
            const timeout = setTimeout(() => {
                this.logEmitFromStream('waitFor timeout', this.streamId, event)
                this.off(event, handler as EmittedEvents[E])
                reject(new Error(`Timed out waiting for event: ${event}`))
            }, opts.timeoutMs)

            this.on(event, handler as EmittedEvents[E])
        })
    }
}
