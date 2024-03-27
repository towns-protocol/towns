import TypedEmitter from 'typed-emitter'
import { GdmChannelPayload, GdmChannelPayload_Snapshot, Snapshot } from '@river-build/proto'
import { StreamStateView_AbstractContent } from './streamStateView_AbstractContent'
import {
    ConfirmedTimelineEvent,
    ParsedEvent,
    RemoteTimelineEvent,
    StreamTimelineEvent,
} from './types'
import { DecryptedContent } from './encryptedContentTypes'
import { StreamEncryptionEvents, StreamEvents, StreamStateEvents } from './streamEvents'
import { StreamStateView_ChannelMetadata } from './streamStateView_ChannelMetadata'
import { check } from '@river-build/dlog'
import { logNever } from './check'

export class StreamStateView_GDMChannel extends StreamStateView_AbstractContent {
    readonly streamId: string
    readonly channelMetadata: StreamStateView_ChannelMetadata

    lastEventCreatedAtEpochMs = 0n

    constructor(streamId: string) {
        super()
        this.channelMetadata = new StreamStateView_ChannelMetadata(streamId)
        this.streamId = streamId
    }

    applySnapshot(
        snapshot: Snapshot,
        content: GdmChannelPayload_Snapshot,
        cleartexts: Record<string, string> | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ): void {
        if (content.channelProperties) {
            this.channelMetadata.applySnapshot(
                content.channelProperties,
                cleartexts,
                encryptionEmitter,
            )
        }
    }

    prependEvent(
        event: RemoteTimelineEvent,
        cleartext: string | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        _stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.case === 'gdmChannelPayload')
        const payload: GdmChannelPayload = event.remoteEvent.event.payload.value
        switch (payload.content.case) {
            case 'inception':
                this.updateLastEvent(event.remoteEvent, undefined)
                break
            case 'message':
                this.updateLastEvent(event.remoteEvent, undefined)
                this.decryptEvent(
                    'channelMessage',
                    event,
                    payload.content.value,
                    cleartext,
                    encryptionEmitter,
                )
                break
            case 'channelProperties':
                // nothing to do, conveyed in the snapshot
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
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.case === 'gdmChannelPayload')
        const payload: GdmChannelPayload = event.remoteEvent.event.payload.value
        switch (payload.content.case) {
            case 'inception':
                this.updateLastEvent(event.remoteEvent, stateEmitter)
                break
            case 'message':
                this.decryptEvent(
                    'channelMessage',
                    event,
                    payload.content.value,
                    cleartext,
                    encryptionEmitter,
                )
                this.updateLastEvent(event.remoteEvent, stateEmitter)
                break
            case 'channelProperties':
                this.channelMetadata.appendEvent(event, cleartext, encryptionEmitter)
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
        if (content.kind === 'channelProperties') {
            this.channelMetadata.onDecryptedContent(eventId, content, emitter)
        }
    }

    onConfirmedEvent(
        event: ConfirmedTimelineEvent,
        emitter: TypedEmitter<StreamEvents> | undefined,
    ): void {
        super.onConfirmedEvent(event, emitter)
    }

    onAppendLocalEvent(
        event: StreamTimelineEvent,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        this.lastEventCreatedAtEpochMs = event.createdAtEpochMs
        stateEmitter?.emit('streamLatestTimestampUpdated', this.streamId)
    }

    getChannelMetadata(): StreamStateView_ChannelMetadata | undefined {
        return this.channelMetadata
    }

    private updateLastEvent(
        event: ParsedEvent,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ) {
        const createdAtEpochMs = event.event.createdAtEpochMs
        if (createdAtEpochMs > this.lastEventCreatedAtEpochMs) {
            this.lastEventCreatedAtEpochMs = createdAtEpochMs
            stateEmitter?.emit('streamLatestTimestampUpdated', this.streamId)
        }
    }
}
