import TypedEmitter from 'typed-emitter'
import { Snapshot, MediaPayload, MediaPayload_Snapshot } from '@towns-protocol/proto'
import { RemoteTimelineEvent } from './types'
import { StreamStateView_AbstractContent } from './streamStateView_AbstractContent'
import { check } from '@towns-protocol/dlog'
import { logNever } from './check'
import { StreamEncryptionEvents, StreamStateEvents } from './streamEvents'
import { streamIdFromBytes, userIdFromAddress } from './id'

export class StreamStateView_Media extends StreamStateView_AbstractContent {
    readonly streamId: string
    info:
        | {
              spaceId: string
              channelId: string
              userId: string
              chunkCount: number
              chunks: Uint8Array[]
              perChunkEncryption: boolean
              perChunkIVs: Uint8Array[]
          }
        | undefined

    constructor(streamId: string) {
        super()
        this.streamId = streamId
    }

    applySnapshot(
        _snapshot: Snapshot,
        content: MediaPayload_Snapshot,
        _emitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ): void {
        const inception = content.inception
        if (
            !inception?.chunkCount ||
            (!inception.channelId && !inception.spaceId && !inception.userId) ||
            !inception.chunkCount
        ) {
            throw new Error('invalid media snapshot')
        }
        this.info = {
            spaceId: inception.spaceId ? streamIdFromBytes(inception.spaceId) : '',
            channelId: inception.channelId ? streamIdFromBytes(inception.channelId) : '',
            userId: inception.userId ? userIdFromAddress(inception.userId) : '',
            chunkCount: inception.chunkCount,
            chunks: Array<Uint8Array>(inception.chunkCount),
            perChunkEncryption: inception.perChunkEncryption ?? false,
            perChunkIVs: Array<Uint8Array>(inception.chunkCount),
        }
    }

    appendEvent(
        event: RemoteTimelineEvent,
        _cleartext: Uint8Array | string | undefined,
        _encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        _stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.case === 'mediaPayload')
        if (!this.info) {
            return
        }
        const payload: MediaPayload = event.remoteEvent.event.payload.value
        switch (payload.content.case) {
            case 'inception':
                break
            case 'chunk':
                if (
                    payload.content.value.chunkIndex < 0 ||
                    payload.content.value.chunkIndex >= this.info.chunkCount
                ) {
                    throw new Error(`chunkIndex out of bounds: ${payload.content.value.chunkIndex}`)
                }
                this.info.chunks[payload.content.value.chunkIndex] = payload.content.value.data
                if (payload.content.value.iv) {
                    this.info.perChunkIVs[payload.content.value.chunkIndex] =
                        payload.content.value.iv
                }
                break
            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }

    prependEvent(
        event: RemoteTimelineEvent,
        cleartext: Uint8Array | string | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        // append / prepend are identical for media content
        this.appendEvent(event, cleartext, encryptionEmitter, stateEmitter)
    }
}
