import TypedEmitter from 'typed-emitter'
import { EncryptedData } from '@towns-protocol/proto'
import { ConfirmedTimelineEvent, RemoteTimelineEvent, StreamTimelineEvent } from './types'
import { DecryptedContent, EncryptedContent, toDecryptedContent } from './encryptedContentTypes'
import { StreamEncryptionEvents, StreamStateEvents } from './streamEvents'
import { streamIdToBytes } from './id'

export abstract class StreamStateView_AbstractContent {
    abstract readonly streamId: string
    abstract prependEvent(
        event: RemoteTimelineEvent,
        cleartext: Uint8Array | string | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void
    abstract appendEvent(
        event: RemoteTimelineEvent,
        cleartext: Uint8Array | string | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void

    decryptEvent(
        kind: EncryptedContent['kind'],
        event: RemoteTimelineEvent,
        content: EncryptedData,
        cleartext: Uint8Array | string | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ) {
        if (cleartext) {
            event.decryptedContent = toDecryptedContent(kind, content.version, cleartext)
        } else {
            encryptionEmitter?.emit('newEncryptedContent', this.streamId, event.hashStr, {
                kind,
                content,
            })
        }
    }

    onConfirmedEvent(
        _event: ConfirmedTimelineEvent,
        _stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
        _encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ): void {
        //
    }

    onDecryptedContent(
        _eventId: string,
        _content: DecryptedContent,
        _stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        //
    }

    onAppendLocalEvent(
        _event: StreamTimelineEvent,
        _stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        //
    }

    getStreamParentId(): string | undefined {
        return undefined
    }

    getStreamParentIdAsBytes(): Uint8Array | undefined {
        const streamParentId = this.getStreamParentId()
        if (streamParentId === undefined) {
            return undefined
        }
        return streamIdToBytes(streamParentId)
    }
}
