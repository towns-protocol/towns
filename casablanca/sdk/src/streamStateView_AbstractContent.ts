import TypedEmitter from 'typed-emitter'
import { ChannelMessage, EncryptedData } from '@river/proto'
import { EmittedEvents } from './client'
import { ConfirmedTimelineEvent, RemoteTimelineEvent } from './types'
import { StreamStateView_Membership } from './streamStateView_Membership'
import { DecryptedContent, EncryptedContent } from './encryptedContentTypes'
import { checkNever } from './check'
import { StreamStateView_UserMetadata } from './streamStateView_UserMetadata'

export abstract class StreamStateView_AbstractContent {
    abstract readonly streamId: string
    abstract readonly memberships: StreamStateView_Membership
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
            switch (kind) {
                case 'channelMessage':
                    event.decryptedContent = {
                        kind,
                        content: ChannelMessage.fromJsonString(cleartext),
                    }
                    break
                case 'text':
                    event.decryptedContent = {
                        kind,
                        content: cleartext,
                    }
                    break
                default:
                    checkNever(kind)
            }
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
        this.memberships.onConfirmedEvent(event, emitter)
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
}
