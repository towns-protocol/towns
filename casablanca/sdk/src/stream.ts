import { StreamAndCookie } from '@river/proto'

import { DLogger } from './dlog'
import EventEmitter from 'events'
import TypedEmitter from 'typed-emitter'
import { StreamStateView } from './streamStateView'
import { ParsedEvent } from './types'
import { EmittedEvents } from './client'

export class Stream extends (EventEmitter as new () => TypedEmitter<EmittedEvents>) {
    readonly clientEmitter: TypedEmitter<EmittedEvents>
    readonly logEmitFromStream: DLogger
    readonly view: StreamStateView
    readonly foreignUserStream: boolean

    constructor(
        streamId: string,
        inceptionEvent: ParsedEvent | undefined,
        clientEmitter: TypedEmitter<EmittedEvents>,
        logEmitFromStream: DLogger,
        foreignUserStream?: boolean,
    ) {
        super()
        this.clientEmitter = clientEmitter
        this.logEmitFromStream = logEmitFromStream
        this.view = new StreamStateView(streamId, inceptionEvent)
        this.foreignUserStream = foreignUserStream ?? false
    }

    get streamId(): string {
        return this.view.streamId
    }

    /**
     * NOTE: Separating initial rollup from the constructor allows consumer to subscribe to events
     * on the new stream event and still access this object through Client.streams.
     */
    update(streamAndCookie: StreamAndCookie, init?: boolean): void {
        this.view.update(streamAndCookie, this, init)
    }

    emit<E extends keyof EmittedEvents>(event: E, ...args: Parameters<EmittedEvents[E]>): boolean {
        this.logEmitFromStream(event, ...args)
        this.clientEmitter.emit(event, ...args)
        return super.emit(event, ...args)
    }
}
