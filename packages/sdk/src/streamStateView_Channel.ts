import TypedEmitter from 'typed-emitter'
import { RemoteTimelineEvent } from './types'
import { ChannelPayload, ChannelPayload_Snapshot, Snapshot } from '@towns-protocol/proto'
import { StreamStateView_AbstractContent } from './streamStateView_AbstractContent'
import { check } from '@towns-protocol/dlog'
import { logNever } from './check'
import { StreamEncryptionEvents, StreamEvents, StreamStateEvents } from './streamEvents'
import { streamIdFromBytes } from './id'
import { StreamStateView_ChannelMessages } from './streamStateView_Common_ChannelMessages'
import { DecryptedContent } from './encryptedContentTypes'
export class StreamStateView_Channel extends StreamStateView_AbstractContent {
    readonly streamId: string
    spaceId: string = ''
    readonlytips: { [key: string]: bigint } = {}
    private reachedRenderableContent = false
    readonly messages: StreamStateView_ChannelMessages

    constructor(streamId: string) {
        super()
        this.streamId = streamId
        this.messages = new StreamStateView_ChannelMessages(streamId, this)
    }

    getStreamParentId(): string | undefined {
        return this.spaceId
    }

    needsScrollback(): boolean {
        return !this.reachedRenderableContent
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
                // if we have a refEventId it means we're a reaction or thread message
                if (!payload.content.value.refEventId) {
                    this.reachedRenderableContent = true
                }
                this.messages.prependChannelMessage(
                    event,
                    cleartext,
                    encryptionEmitter,
                    undefined,
                    payload.content.value,
                )
                break
            case 'redaction':
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
                if (!payload.content.value.refEventId) {
                    this.reachedRenderableContent = true
                }
                this.messages.appendChannelMessage(
                    event,
                    cleartext,
                    encryptionEmitter,
                    undefined,
                    payload.content.value,
                )
                break
            case 'redaction':
                break
            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }

    onDecryptedContent(
        eventId: string,
        content: DecryptedContent,
        emitter: TypedEmitter<StreamEvents>,
    ): void {
        if (content.kind === 'channelMessage') {
            this.messages.onDecryptedContent(eventId, content, emitter)
        }
    }
}
