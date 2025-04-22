import TypedEmitter from 'typed-emitter'
import { StreamEncryptionEvents, StreamStateEvents } from './streamEvents'
import { StreamStateView_AbstractContent } from './streamStateView_AbstractContent'
import { RemoteTimelineEvent } from './types'
import { EncryptedData } from '@towns-protocol/proto'
import { DecryptedContent } from './encryptedContentTypes'

/// place to hold common logic for decrypting "ChannelMessage" payloads
export class StreamStateView_ChannelMessages {
    constructor(
        public readonly streamId: string,
        private readonly parent: StreamStateView_AbstractContent,
    ) {}

    onDecryptedContent(
        _eventId: string,
        _content: DecryptedContent,
        _stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        // pass
    }

    appendChannelMessage(
        event: RemoteTimelineEvent,
        cleartext: Uint8Array | string | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
        value: EncryptedData,
    ): void {
        this.parent.decryptEvent('channelMessage', event, value, cleartext, encryptionEmitter)
    }

    prependChannelMessage(
        event: RemoteTimelineEvent,
        cleartext: Uint8Array | string | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
        value: EncryptedData,
    ): void {
        this.parent.decryptEvent('channelMessage', event, value, cleartext, encryptionEmitter)
    }
}
