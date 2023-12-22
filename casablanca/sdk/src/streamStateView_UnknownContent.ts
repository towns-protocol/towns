import TypedEmitter from 'typed-emitter'
import { StreamStateView_AbstractContent } from './streamStateView_AbstractContent'
import { StreamEvents } from './streamEvents'
import { RemoteTimelineEvent } from './types'

export class StreamStateView_UnknownContent extends StreamStateView_AbstractContent {
    constructor(readonly streamId: string) {
        super()
    }

    prependEvent(
        _event: RemoteTimelineEvent,
        _cleartext: string | undefined,
        _emitter: TypedEmitter<StreamEvents> | undefined,
    ): void {
        throw new Error(`Unknown content type`)
    }

    appendEvent(
        _event: RemoteTimelineEvent,
        _cleartext: string | undefined,
        _emitter: TypedEmitter<StreamEvents> | undefined,
    ): void {
        throw new Error(`Unknown content type`)
    }
}
