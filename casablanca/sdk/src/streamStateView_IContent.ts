import TypedEmitter from 'typed-emitter'
import { MiniblockHeader } from '@river/proto'
import { EmittedEvents } from './client'
import { ParsedEvent } from './types'
import { StreamStateView_Membership } from './streamStateView_Membership'

export abstract class StreamStateView_IContent {
    abstract readonly streamId: string
    abstract readonly memberships: StreamStateView_Membership
    abstract onMiniblockHeader(
        blockHeader: MiniblockHeader,
        emitter?: TypedEmitter<EmittedEvents>,
    ): void
    abstract prependEvent(
        event: ParsedEvent,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void
    abstract appendEvent(event: ParsedEvent, emitter: TypedEmitter<EmittedEvents> | undefined): void
}
