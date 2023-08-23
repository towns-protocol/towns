import { Miniblock, Snapshot, StreamAndCookie } from '@river/proto'

import { DLogger } from './dlog'
import EventEmitter from 'events'
import TypedEmitter from 'typed-emitter'
import { StreamStateView } from './streamStateView'
import { EmittedEvents } from './client'
import { RiverEvent } from './event'

export class Stream extends (EventEmitter as new () => TypedEmitter<EmittedEvents>) {
    readonly clientEmitter: TypedEmitter<EmittedEvents>
    readonly logEmitFromStream: DLogger
    readonly view: StreamStateView
    readonly foreignUserStream: boolean

    constructor(
        streamId: string,
        snapshot: Snapshot,
        clientEmitter: TypedEmitter<EmittedEvents>,
        logEmitFromStream: DLogger,
        foreignUserStream?: boolean,
    ) {
        super()
        this.clientEmitter = clientEmitter
        this.logEmitFromStream = logEmitFromStream
        this.view = new StreamStateView(streamId, snapshot)
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
        miniblocks: Miniblock[],
    ): void {
        this.view.initialize(streamAndCookie, snapshot, miniblocks, this)
    }

    appendEvents(streamAndCookie: StreamAndCookie): void {
        this.view.appendEvents(streamAndCookie, this)
    }

    emit<E extends keyof EmittedEvents>(event: E, ...args: Parameters<EmittedEvents[E]>): boolean {
        this.logEmitFromStream(event, ...args)
        this.clientEmitter.emit(event, ...args)
        return super.emit(event, ...args)
    }
}
