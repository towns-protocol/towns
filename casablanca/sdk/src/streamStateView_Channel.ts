import TypedEmitter from 'typed-emitter'
import { RemoteTimelineEvent } from './types'
import { ChannelPayload, ChannelPayload_Snapshot, Snapshot } from '@river/proto'
import { StreamStateView_AbstractContent } from './streamStateView_AbstractContent'
import { check } from '@river/dlog'
import { logNever } from './check'
import { StreamEncryptionEvents, StreamStateEvents } from './streamEvents'

export class StreamStateView_Channel extends StreamStateView_AbstractContent {
    readonly streamId: string
    spaceId: string = ''
    private reachedRenderableContent = false

    constructor(_userId: string, streamId: string) {
        super()
        this.streamId = streamId
    }

    needsScrollback(): boolean {
        return !this.reachedRenderableContent
    }

    applySnapshot(
        snapshot: Snapshot,
        content: ChannelPayload_Snapshot,
        _encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ): void {
        this.spaceId = content.inception?.spaceId ?? ''
    }

    prependEvent(
        event: RemoteTimelineEvent,
        cleartext: string | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        _stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.case === 'channelPayload')
        const payload: ChannelPayload = event.remoteEvent.event.payload.value
        switch (payload.content.case) {
            case 'inception':
                break
            case 'message':
                this.reachedRenderableContent = true
                this.decryptEvent(
                    'channelMessage',
                    event,
                    payload.content.value,
                    cleartext,
                    encryptionEmitter,
                )
                break
            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }

    appendEvent(
        event: RemoteTimelineEvent,
        cleartext: string | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        _stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.case === 'channelPayload')
        const payload: ChannelPayload = event.remoteEvent.event.payload.value
        switch (payload.content.case) {
            case 'inception':
                break
            case 'message':
                this.reachedRenderableContent = true
                this.decryptEvent(
                    'channelMessage',
                    event,
                    payload.content.value,
                    cleartext,
                    encryptionEmitter,
                )
                break
            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }
}
