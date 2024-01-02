import TypedEmitter from 'typed-emitter'
import { ChannelProperties, EncryptedData, WrappedEncryptedData } from '@river/proto'
import { EmittedEvents } from './client'
import { bin_toHexString, dlog } from '@river/mecholm'

export class StreamStateView_ChannelMetadata {
    log = dlog('csb:streams:channel_metadata')
    readonly userId: string
    readonly streamId: string
    channelProperties: ChannelProperties | undefined
    latestEncryptedChannelProperties?: { eventId: string; data: EncryptedData }

    constructor(userId: string, streamId: string) {
        this.userId = userId
        this.streamId = streamId
    }

    initialize(
        encryptedChannelProperties: WrappedEncryptedData,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        if (!encryptedChannelProperties.data) {
            return
        }

        const eventId = bin_toHexString(encryptedChannelProperties.eventHash)
        this.latestEncryptedChannelProperties = {
            eventId: eventId,
            data: encryptedChannelProperties.data,
        }

        emitter?.emit('newEncryptedContent', this.streamId, eventId, {
            kind: 'channelProperties',
            content: encryptedChannelProperties.data,
        })
    }

    appendEncryptedData(
        eventId: string,
        data: EncryptedData,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        this.latestEncryptedChannelProperties = { eventId, data }
        emitter?.emit('newEncryptedContent', this.streamId, eventId, {
            kind: 'channelProperties',
            content: data,
        })
    }

    prependEncryptedData(
        eventId: string,
        data: EncryptedData,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        emitter?.emit('newEncryptedContent', this.streamId, eventId, {
            kind: 'channelProperties',
            content: data,
        })
    }

    onDecryptedContent(
        eventId: string,
        content: ChannelProperties,
        emitter?: TypedEmitter<EmittedEvents>,
    ) {
        if (!this.latestEncryptedChannelProperties) {
            return
        }

        if (this.latestEncryptedChannelProperties.eventId !== eventId) {
            return
        }

        this.channelProperties = content
        emitter?.emit('streamChannelPropertiesUpdated', this.streamId)
    }
}
