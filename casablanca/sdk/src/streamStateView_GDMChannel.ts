import TypedEmitter from 'typed-emitter'
import { GdmChannelPayload, GdmChannelPayload_Snapshot, Snapshot } from '@river/proto'
import { StreamStateView_AbstractContent } from './streamStateView_AbstractContent'
import {
    ConfirmedTimelineEvent,
    ParsedEvent,
    RemoteTimelineEvent,
    StreamTimelineEvent,
} from './types'
import { StreamStateView_UserMetadata } from './streamStateView_UserMetadata'
import { DecryptedContent } from './encryptedContentTypes'
import { StreamEncryptionEvents, StreamEvents, StreamStateEvents } from './streamEvents'
import { StreamStateView_ChannelMetadata } from './streamStateView_ChannelMetadata'
import { check } from '@river/dlog'
import { logNever } from './check'

export class StreamStateView_GDMChannel extends StreamStateView_AbstractContent {
    readonly streamId: string
    readonly userMetadata: StreamStateView_UserMetadata
    readonly channelMetadata: StreamStateView_ChannelMetadata

    lastEventCreatedAtEpocMs = 0n

    constructor(userId: string, streamId: string) {
        super()
        this.userMetadata = new StreamStateView_UserMetadata(userId, streamId)
        this.channelMetadata = new StreamStateView_ChannelMetadata(userId, streamId)
        this.streamId = streamId
    }

    applySnapshot(
        snapshot: Snapshot,
        content: GdmChannelPayload_Snapshot,
        cleartexts: Record<string, string> | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ): void {
        this.userMetadata.applySnapshot(
            content.usernames,
            content.displayNames,
            cleartexts,
            encryptionEmitter,
        )
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
            case 'displayName':
            case 'username':
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
            case 'displayName':
            case 'username':
                this.userMetadata.appendEncryptedData(
                    event.hashStr,
                    payload.content.value,
                    payload.content.case,
                    event.creatorUserId,
                    cleartext,
                    encryptionEmitter,
                    stateEmitter,
                )
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
        if (content.kind === 'text') {
            this.userMetadata.onDecryptedContent(eventId, content.content, emitter)
        } else if (content.kind === 'channelProperties') {
            this.channelMetadata.onDecryptedContent(eventId, content, emitter)
        }
    }

    onConfirmedEvent(
        event: ConfirmedTimelineEvent,
        emitter: TypedEmitter<StreamEvents> | undefined,
    ): void {
        super.onConfirmedEvent(event, emitter)
        this.userMetadata.onConfirmedEvent(event, emitter)
    }

    onAppendLocalEvent(
        event: StreamTimelineEvent,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        this.lastEventCreatedAtEpocMs = event.createdAtEpocMs
        stateEmitter?.emit('streamLatestTimestampUpdated', this.streamId)
    }

    getUserMetadata(): StreamStateView_UserMetadata {
        return this.userMetadata
    }

    getChannelMetadata(): StreamStateView_ChannelMetadata | undefined {
        return this.channelMetadata
    }

    private updateLastEvent(
        event: ParsedEvent,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ) {
        const createdAtEpocMs = event.event.createdAtEpocMs
        if (createdAtEpocMs > this.lastEventCreatedAtEpocMs) {
            this.lastEventCreatedAtEpocMs = createdAtEpocMs
            stateEmitter?.emit('streamLatestTimestampUpdated', this.streamId)
        }
    }
}
