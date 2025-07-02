import TypedEmitter from 'typed-emitter'
import { ChannelProperties, EncryptedData, WrappedEncryptedData } from '@towns-protocol/proto'
import { bin_toHexString, dlog, check } from '@towns-protocol/dlog'
import { DecryptedContent, toDecryptedContent } from './encryptedContentTypes'
import { StreamEncryptionEvents, StreamEvents, StreamStateEvents } from './streamEvents'
import { RemoteTimelineEvent } from './types'
import { GdmStreamModel, GdmStreamsView } from './views/streams/gdmStreams'

// channel metadata is only used by gdms, could be moved back into the _GDMChannel helper
export class StreamStateView_ChannelMetadata {
    log = dlog('csb:streams:channel_metadata')
    readonly streamId: string

    // named channelProperties for backwards compatibility
    get channelProperties(): ChannelProperties | undefined {
        return this.gdmStreamModel.metadata
    }

    get metadataEventId(): string | undefined {
        return this.gdmStreamModel.metadataEventId
    }

    get gdmStreamModel(): GdmStreamModel {
        return this.gdmStreamsView.get(this.streamId)
    }

    constructor(
        streamId: string,
        private gdmStreamsView: GdmStreamsView,
    ) {
        this.streamId = streamId
    }

    applySnapshot(
        encryptedChannelProperties: WrappedEncryptedData,
        cleartexts: Record<string, Uint8Array | string> | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ): void {
        if (!encryptedChannelProperties.data) {
            return
        }

        const eventId = bin_toHexString(encryptedChannelProperties.eventHash)
        const cleartext = cleartexts?.[eventId]
        this.gdmStreamsView.setLatestMetadataEventId(this.streamId, eventId)
        this.decryptPayload(encryptedChannelProperties.data, eventId, cleartext, encryptionEmitter)
    }

    appendEvent(
        event: RemoteTimelineEvent,
        cleartext: Uint8Array | string | undefined,
        emitter: TypedEmitter<StreamEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.case === 'gdmChannelPayload')
        check(event.remoteEvent.event.payload.value.content.case === 'channelProperties')
        const payload = event.remoteEvent.event.payload.value.content.value
        this.gdmStreamsView.setLatestMetadataEventId(this.streamId, event.hashStr)
        this.decryptPayload(payload, event.hashStr, cleartext, emitter)
    }

    prependEvent(
        _event: RemoteTimelineEvent,
        _cleartext: Uint8Array | string | undefined,
        _emitter: TypedEmitter<StreamEvents> | undefined,
    ): void {
        // conveyed in snapshot
    }

    onDecryptedContent(
        eventId: string,
        content: DecryptedContent,
        stateEmitter: TypedEmitter<StreamStateEvents>,
    ): void {
        this.handleDecryptedContent(eventId, content, stateEmitter)
    }

    private decryptPayload(
        payload: EncryptedData,
        eventId: string,
        cleartext: Uint8Array | string | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ) {
        if (cleartext) {
            const decryptedContent = toDecryptedContent(
                'channelProperties',
                payload.version,
                cleartext,
            )
            this.handleDecryptedContent(eventId, decryptedContent, encryptionEmitter)
        } else {
            encryptionEmitter?.emit('newEncryptedContent', this.streamId, eventId, {
                kind: 'channelProperties',
                content: payload,
            })
        }
    }

    private handleDecryptedContent(
        eventId: string,
        content: DecryptedContent,
        emitter: TypedEmitter<StreamEvents> | undefined,
    ) {
        if (content.kind === 'channelProperties') {
            if (
                !this.gdmStreamModel.metadataEventId ||
                !this.gdmStreamModel.metadata ||
                this.gdmStreamModel.latestMetadataEventId === eventId
            ) {
                this.gdmStreamsView.setMetadata(this.streamId, content.content, eventId)
                emitter?.emit('streamChannelPropertiesUpdated', this.streamId)
            } else {
                this.log('channelProperties eventId mismatch', {
                    eventId,
                    content,
                    gdmStreamModel: this.gdmStreamModel,
                })
            }
        } else {
            check(false)
        }
    }
}
