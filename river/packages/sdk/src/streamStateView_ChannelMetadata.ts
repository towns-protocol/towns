import TypedEmitter from 'typed-emitter'
import { ChannelProperties, EncryptedData, WrappedEncryptedData } from '@river-build/proto'
import { bin_toHexString, dlog, check } from '@river-build/dlog'
import { DecryptedContent, toDecryptedContent } from './encryptedContentTypes'
import { StreamEncryptionEvents, StreamEvents, StreamStateEvents } from './streamEvents'
import { RemoteTimelineEvent } from './types'

export class StreamStateView_ChannelMetadata {
    log = dlog('csb:streams:channel_metadata')
    readonly streamId: string
    channelProperties: ChannelProperties | undefined
    latestEncryptedChannelProperties?: { eventId: string; data: EncryptedData }

    constructor(streamId: string) {
        this.streamId = streamId
    }

    applySnapshot(
        encryptedChannelProperties: WrappedEncryptedData,
        cleartexts: Record<string, string> | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ): void {
        if (!encryptedChannelProperties.data) {
            return
        }

        const eventId = bin_toHexString(encryptedChannelProperties.eventHash)
        this.latestEncryptedChannelProperties = {
            eventId: eventId,
            data: encryptedChannelProperties.data,
        }

        const cleartext = cleartexts?.[eventId]
        this.decryptPayload(encryptedChannelProperties.data, eventId, cleartext, encryptionEmitter)
    }

    private decryptPayload(
        payload: EncryptedData,
        eventId: string,
        cleartext: string | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ) {
        if (cleartext) {
            const decryptedContent = toDecryptedContent('channelProperties', cleartext)
            this.handleDecryptedContent(decryptedContent, encryptionEmitter)
        } else {
            encryptionEmitter?.emit('newEncryptedContent', this.streamId, eventId, {
                kind: 'channelProperties',
                content: payload,
            })
        }
    }

    private handleDecryptedContent(
        content: DecryptedContent,
        emitter: TypedEmitter<StreamEvents> | undefined,
    ) {
        if (content.kind === 'channelProperties') {
            this.channelProperties = content.content
            emitter?.emit('streamChannelPropertiesUpdated', this.streamId)
        } else {
            check(false)
        }
    }

    appendEvent(
        event: RemoteTimelineEvent,
        cleartext: string | undefined,
        emitter: TypedEmitter<StreamEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.case === 'gdmChannelPayload')
        check(event.remoteEvent.event.payload.value.content.case === 'channelProperties')
        const payload = event.remoteEvent.event.payload.value.content.value
        this.decryptPayload(payload, event.hashStr, cleartext, emitter)
    }

    prependEvent(
        _event: RemoteTimelineEvent,
        _cleartext: string | undefined,
        _emitter: TypedEmitter<StreamEvents> | undefined,
    ): void {
        // conveyed in snapshot
    }

    onDecryptedContent(
        _eventId: string,
        content: DecryptedContent,
        stateEmitter: TypedEmitter<StreamStateEvents>,
    ): void {
        this.handleDecryptedContent(content, stateEmitter)
    }
}
