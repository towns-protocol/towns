import TypedEmitter from 'typed-emitter'
import { RemoteTimelineEvent } from './types'
import { ChannelPayload, ChannelPayload_Snapshot, Snapshot } from '@towns-protocol/proto'
import { StreamStateView_AbstractContent } from './streamStateView_AbstractContent'
import { check } from '@towns-protocol/utils'
import { logNever } from './check'
import { StreamEncryptionEvents, StreamEvents, StreamStateEvents } from './streamEvents'
import { spaceIdFromChannelId } from './id'
import { DecryptedContent } from './encryptedContentTypes'
export class StreamStateView_Channel extends StreamStateView_AbstractContent {
    readonly streamId: string
    readonly spaceId: string

    constructor(streamId: string) {
        super()
        this.streamId = streamId
        this.spaceId = spaceIdFromChannelId(this.streamId)
    }

    applySnapshot(
        _snapshot: Snapshot,
        _content: ChannelPayload_Snapshot,
        _cleartexts: Record<string, Uint8Array | string> | undefined,
        _encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ): void {
        // pass
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
            case 'interactionRequest': {
                const encryptedData = payload.content.value.encryptedData
                if (encryptedData) {
                    this.decryptEvent(
                        'interactionRequestPayload',
                        event,
                        encryptedData,
                        cleartext,
                        encryptionEmitter,
                    )
                }
                break
            }
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
            case 'interactionRequest': {
                const encryptedData = payload.content.value.encryptedData
                if (encryptedData) {
                    this.decryptEvent(
                        'interactionRequestPayload',
                        event,
                        encryptedData,
                        cleartext,
                        encryptionEmitter,
                    )
                }
                break
            }
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
