import TypedEmitter from 'typed-emitter'
import { MiniblockHeader } from '@river/proto'
import { EmittedEvents } from './client'

export interface StreamStateView_IContent {
    onMiniblockHeader(blockHeader: MiniblockHeader, emitter?: TypedEmitter<EmittedEvents>): void
}

export class StreamStateView_UnknownContent implements StreamStateView_IContent {
    onMiniblockHeader(_blockHeader: MiniblockHeader, _emitter?: TypedEmitter<EmittedEvents>): void {
        // do nothing
    }
}
