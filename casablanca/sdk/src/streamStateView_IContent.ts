import TypedEmitter from 'typed-emitter'
import { ChannelMessage, EncryptedData, MiniblockHeader } from '@river/proto'
import { EmittedEvents } from './client'
import { RemoteTimelineEvent } from './types'
import { StreamStateView_Membership } from './streamStateView_Membership'
import { EncryptedContent } from './encryptedContentTypes'
import { checkNever } from './check'

export abstract class StreamStateView_IContent {
    abstract readonly streamId: string
    abstract readonly memberships: StreamStateView_Membership
    abstract onMiniblockHeader(
        blockHeader: MiniblockHeader,
        emitter?: TypedEmitter<EmittedEvents>,
    ): void
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
}
