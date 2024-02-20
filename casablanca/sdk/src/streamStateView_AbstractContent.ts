import TypedEmitter from 'typed-emitter'
import { EncryptedData } from '@river/proto'
import { ConfirmedTimelineEvent, RemoteTimelineEvent, StreamTimelineEvent } from './types'
import { StreamStateView_Membership } from './streamStateView_Membership'
import { DecryptedContent, EncryptedContent, toDecryptedContent } from './encryptedContentTypes'
import { StreamStateView_UserMetadata } from './streamStateView_UserMetadata'
import { StreamStateView_ChannelMetadata } from './streamStateView_ChannelMetadata'
import { StreamEncryptionEvents, StreamStateEvents } from './streamEvents'

export abstract class StreamStateView_AbstractContent {
    abstract readonly streamId: string
    readonly memberships?: StreamStateView_Membership
    abstract prependEvent(
        event: RemoteTimelineEvent,
        cleartext: string | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void
    abstract appendEvent(
        event: RemoteTimelineEvent,
        cleartext: string | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void

    decryptEvent(
        kind: EncryptedContent['kind'],
        event: RemoteTimelineEvent,
        content: EncryptedData,
        cleartext: string | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ) {
        if (cleartext) {
            event.decryptedContent = toDecryptedContent(kind, cleartext)
        } else {
            encryptionEmitter?.emit('newEncryptedContent', this.streamId, event.hashStr, {
                kind,
                content,
            })
        }
    }

    onConfirmedEvent(
        event: ConfirmedTimelineEvent,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        this.memberships?.onConfirmedEvent(event, stateEmitter)
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

    getUserMetadata(): StreamStateView_UserMetadata | undefined {
        return undefined
    }

    getChannelMetadata(): StreamStateView_ChannelMetadata | undefined {
        return undefined
    }

    needsScrollback(): boolean {
        return false
    }
}
