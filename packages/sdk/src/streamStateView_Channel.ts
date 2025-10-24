import TypedEmitter from 'typed-emitter'
import { RemoteTimelineEvent } from './types'
import { ChannelPayload, ChannelPayload_Snapshot, Snapshot } from '@towns-protocol/proto'
import { StreamStateView_AbstractContent } from './streamStateView_AbstractContent'
import { check } from '@towns-protocol/utils'
import { logNever } from './check'
import { StreamEncryptionEvents, StreamEvents, StreamStateEvents } from './streamEvents'
import { streamIdFromBytes } from './id'
import { DecryptedContent } from './encryptedContentTypes'
export class StreamStateView_Channel extends StreamStateView_AbstractContent {
    readonly streamId: string
    spaceId: string = ''

    constructor(streamId: string) {
        super()
        this.streamId = streamId
    }

    getStreamParentId(): string | undefined {
        return this.spaceId
    }

    applySnapshot(
        snapshot: Snapshot,
        content: ChannelPayload_Snapshot,
        _cleartexts: Record<string, Uint8Array | string> | undefined,
        _encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ): void {
        this.spaceId = streamIdFromBytes(content.inception?.spaceId ?? Uint8Array.from([]))
    }

    prependEvent(
        event: RemoteTimelineEvent,
        cleartext: Uint8Array | string | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        _stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.case === 'channelPayload')
        const payload: ChannelPayload = event.remoteEvent.event.payload.value
        switch (payload.content.case) {
            case 'inception':
                break
            case 'message':
                this.decryptEvent(
                    'channelMessage',
                    event,
                    payload.content.value,
                    cleartext,
                    encryptionEmitter,
                )
                break
            case 'redaction':
                break
            case 'custom':
                break
            case 'interactionRequest':
                break
            case 'interactionResponse':
                break
            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }

    appendEvent(
        event: RemoteTimelineEvent,
        cleartext: Uint8Array | string | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        _stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.case === 'channelPayload')
        const payload: ChannelPayload = event.remoteEvent.event.payload.value
        switch (payload.content.case) {
            case 'inception':
                break
            case 'message':
                this.decryptEvent(
                    'channelMessage',
                    event,
                    payload.content.value,
                    cleartext,
                    encryptionEmitter,
                )
                break
            case 'redaction':
                break
            case 'custom':
                break
            case undefined:
                break
            case 'interactionRequest':
                break
            case 'interactionResponse':
                break
            default:
                logNever(payload.content)
        }
    }

    onDecryptedContent(
        _eventId: string,
        _content: DecryptedContent,
        _emitter: TypedEmitter<StreamEvents>,
    ): void {
        // pass
    }
}
