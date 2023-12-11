import TypedEmitter from 'typed-emitter'
import { StreamStateView_IContent } from './streamStateView_IContent'
import { StreamEvents } from './streamEvents'
import { RemoteTimelineEvent } from './types'
import { StreamStateView_Membership } from './streamStateView_Membership'

export class StreamStateView_UnknownContent extends StreamStateView_IContent {
    constructor(readonly streamId: string) {
        super()
    }

    get memberships(): StreamStateView_Membership {
        throw new Error(`Unknown content type`)
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
