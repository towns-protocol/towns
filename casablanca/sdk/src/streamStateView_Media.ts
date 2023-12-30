import TypedEmitter from 'typed-emitter'
import { Snapshot, MediaPayload, MediaPayload_Inception, MediaPayload_Snapshot } from '@river/proto'
import { RemoteTimelineEvent } from './types'
import { EmittedEvents } from './client'
import { StreamStateView_AbstractContent } from './streamStateView_AbstractContent'
import { check, logNever } from '@river/mecholm'

export class StreamStateView_Media extends StreamStateView_AbstractContent {
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

    initialize(
        _snapshot: Snapshot,
        _content: MediaPayload_Snapshot,
        _emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        // empty for now — should we store something in the snapshot?
    }

    appendEvent(
        event: RemoteTimelineEvent,
        _cleartext: string | undefined,
        _emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.case === 'mediaPayload')
        const payload: MediaPayload = event.remoteEvent.event.payload.value
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
        event: RemoteTimelineEvent,
        cleartext: string | undefined,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        // append / prepend are identical for media content
        this.appendEvent(event, cleartext, emitter)
    }
}
