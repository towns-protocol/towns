import TypedEmitter from 'typed-emitter'
import { MiniblockHeader } from '@river/proto'
import { EmittedEvents } from './client'
import { StreamStateView_IContent } from './streamStateView_IContent'
import { StreamEvents } from './streamEvents'
import { ParsedEvent } from './types'
import { StreamStateView_Membership } from './streamStateView_Membership'

export class StreamStateView_UnknownContent extends StreamStateView_IContent {
    constructor(readonly streamId: string) {
        super()
    }

    get memberships(): StreamStateView_Membership {
        throw new Error(`Unknown content type`)
    }

    onMiniblockHeader(_blockHeader: MiniblockHeader, _emitter?: TypedEmitter<EmittedEvents>): void {
        // ...
    }

    prependEvent(_event: ParsedEvent, _emitter: TypedEmitter<StreamEvents> | undefined): void {
        throw new Error(`Unknown content type`)
    }

    appendEvent(_event: ParsedEvent, _emitter: TypedEmitter<StreamEvents> | undefined): void {
        throw new Error(`Unknown content type`)
    }
}
