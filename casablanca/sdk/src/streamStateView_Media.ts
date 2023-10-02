import TypedEmitter from 'typed-emitter'
import { Snapshot, MediaPayload, MediaPayload_Inception, MediaPayload_Snapshot } from '@river/proto'
import { logNever } from './check'
import { ParsedEvent } from './types'
import { EmittedEvents } from './client'

export class StreamStateView_Media {
    readonly streamId: string
    readonly spaceId: string
    readonly channelId: string
    readonly chunkCount: number
    readonly chunks: Uint8Array[]

    constructor(inception: MediaPayload_Inception) {
        this.streamId = inception.streamId
        this.spaceId = inception.spaceId
        this.channelId = inception.channelId
        this.chunkCount = inception.chunkCount
        this.chunks = Array<Uint8Array>(inception.chunkCount)
    }

    initialize(
        _snapshot: Snapshot,
        _content: MediaPayload_Snapshot,
        _emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        // empty for now — should we store something in the snapshot?
    }

    appendEvent(
        _event: ParsedEvent,
        payload: MediaPayload,
        _emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
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

    prependEvent(
        _event: ParsedEvent,
        _payload: MediaPayload,
        _emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        // append / prepend are identical for media content
        this.appendEvent(_event, _payload, _emitter)
    }
}
