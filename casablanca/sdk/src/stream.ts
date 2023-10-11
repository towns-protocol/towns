import { MembershipOp, Miniblock, Snapshot, StreamAndCookie } from '@river/proto'

import { DLogger } from './dlog'
import EventEmitter from 'events'
import TypedEmitter from 'typed-emitter'
import { StreamStateView } from './streamStateView'
import { EmittedEvents } from './client'
import { RiverEvent } from './event'
import { ParsedMiniblock } from './types'

export class Stream extends (EventEmitter as new () => TypedEmitter<EmittedEvents>) {
    readonly clientEmitter: TypedEmitter<EmittedEvents>
    readonly logEmitFromStream: DLogger
    readonly view: StreamStateView
    readonly foreignUserStream: boolean

    constructor(
        userId: string,
        streamId: string,
        snapshot: Snapshot,
        clientEmitter: TypedEmitter<EmittedEvents>,
        logEmitFromStream: DLogger,
        foreignUserStream?: boolean,
    ) {
        super()
        this.clientEmitter = clientEmitter
        this.logEmitFromStream = logEmitFromStream
        this.view = new StreamStateView(userId, streamId, snapshot)
        this.foreignUserStream = foreignUserStream ?? false
    }

    get streamId(): string {
        return this.view.streamId
    }

    updateDecrypted(event: RiverEvent): void {
        this.view.updateDecrypted(event)
    }
    /**
     * NOTE: Separating initial rollup from the constructor allows consumer to subscribe to events
     * on the new stream event and still access this object through Client.streams.
     */
    initialize(
        streamAndCookie: StreamAndCookie,
        snapshot: Snapshot,
        miniblocks: ParsedMiniblock[],
    ): void {
        this.view.initialize(streamAndCookie, snapshot, miniblocks, this)
    }

    appendEvents(streamAndCookie: StreamAndCookie): void {
        this.view.appendEvents(streamAndCookie, this)
    }

    prependEvents(miniblocks: Miniblock[], terminus: boolean) {
        this.view.prependEvents(miniblocks, terminus, this)
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
