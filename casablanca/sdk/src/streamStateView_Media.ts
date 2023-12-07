import TypedEmitter from 'typed-emitter'
import {
    Snapshot,
    MediaPayload,
    MediaPayload_Inception,
    MediaPayload_Snapshot,
    MiniblockHeader,
} from '@river/proto'
import { check, logNever } from './check'
import { ParsedEvent } from './types'
import { EmittedEvents } from './client'
import { StreamStateView_IContent } from './streamStateView_IContent'
import { StreamStateView_Membership } from './streamStateView_Membership'

export class StreamStateView_Media extends StreamStateView_IContent {
    readonly streamId: string
    readonly channelId: string
    readonly chunkCount: number
    readonly chunks: Uint8Array[]

    constructor(inception: MediaPayload_Inception) {
        super()
        this.streamId = inception.streamId
        this.channelId = inception.channelId
        this.chunkCount = inception.chunkCount
        this.chunks = Array<Uint8Array>(inception.chunkCount)
    }

    get memberships(): StreamStateView_Membership {
        // media streams don't have memberships
        throw new Error(`not implemented`)
    }

    initialize(
        _snapshot: Snapshot,
        _content: MediaPayload_Snapshot,
        _emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        // empty for now — should we store something in the snapshot?
    }

    onMiniblockHeader(_blockHeader: MiniblockHeader, _emitter?: TypedEmitter<EmittedEvents>): void {
        // nothing to do
    }

    appendEvent(event: ParsedEvent, _emitter: TypedEmitter<EmittedEvents> | undefined): void {
        check(event.event.payload.case === 'mediaPayload')
        const payload: MediaPayload = event.event.payload.value
        switch (payload.content.case) {
            case 'inception':
                break
            case 'chunk':
                if (
                    payload.content.value.chunkIndex < 0 ||
                    payload.content.value.chunkIndex >= this.chunkCount
                ) {
                    throw new Error(`chunkIndex out of bounds: ${payload.content.value.chunkIndex}`)
                }
                this.chunks[payload.content.value.chunkIndex] = payload.content.value.data
                break
            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }

    prependEvent(event: ParsedEvent, emitter: TypedEmitter<EmittedEvents> | undefined): void {
        // append / prepend are identical for media content
        this.appendEvent(event, emitter)
    }
}
