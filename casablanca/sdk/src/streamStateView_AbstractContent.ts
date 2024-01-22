import TypedEmitter from 'typed-emitter'
import { EncryptedData } from '@river/proto'
import { EmittedEvents } from './client'
import { ConfirmedTimelineEvent, RemoteTimelineEvent } from './types'
import { StreamStateView_Membership } from './streamStateView_Membership'
import { DecryptedContent, EncryptedContent, toDecryptedContent } from './encryptedContentTypes'
import { StreamStateView_UserMetadata } from './streamStateView_UserMetadata'
import { StreamStateView_ChannelMetadata } from './streamStateView_ChannelMetadata'

export abstract class StreamStateView_AbstractContent {
    abstract readonly streamId: string
    readonly memberships?: StreamStateView_Membership
    abstract prependEvent(
        event: RemoteTimelineEvent,
        cleartext: string | undefined,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void
    abstract appendEvent(
        event: RemoteTimelineEvent,
        cleartext: string | undefined,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void

    decryptEvent(
        kind: EncryptedContent['kind'],
        event: RemoteTimelineEvent,
        content: EncryptedData,
        cleartext: string | undefined,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ) {
        if (cleartext) {
            event.decryptedContent = toDecryptedContent(kind, cleartext)
        } else {
            emitter?.emit('newEncryptedContent', this.streamId, event.hashStr, {
                kind,
                content,
            })
        }
    }

    onConfirmedEvent(
        event: ConfirmedTimelineEvent,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        this.memberships?.onConfirmedEvent(event, emitter)
    }

    onDecryptedContent(
        _eventId: string,
        _content: DecryptedContent,
        _emitter: TypedEmitter<EmittedEvents>,
    ): void {
        //
    }

    getUserMetadata(): StreamStateView_UserMetadata | undefined {
        return undefined
    }

    getChannelMetadata(): StreamStateView_ChannelMetadata | undefined {
        return undefined
    }
}
