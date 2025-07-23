import TypedEmitter from 'typed-emitter'
import { DmChannelPayload_Snapshot, Snapshot, DmChannelPayload } from '@towns-protocol/proto'
import { StreamStateView_AbstractContent } from './streamStateView_AbstractContent'
import {
    ConfirmedTimelineEvent,
    ParsedEvent,
    RemoteTimelineEvent,
    StreamTimelineEvent,
} from './types'
import { DecryptedContent } from './encryptedContentTypes'
import { StreamEncryptionEvents, StreamStateEvents } from './streamEvents'
import { check } from '@towns-protocol/dlog'
import { logNever } from './check'
import { userIdFromAddress } from './id'
import { DmStreamModel, DmStreamsView } from './views/streams/dmStreams'
export class StreamStateView_DMChannel extends StreamStateView_AbstractContent {
    readonly streamId: string

    get firstPartyId(): string | undefined {
        return this.dmStreamModel.firstPartyId
    }
    get secondPartyId(): string | undefined {
        return this.dmStreamModel.secondPartyId
    }
    get lastEventCreatedAtEpochMs(): bigint {
        return this.dmStreamModel.lastEventCreatedAtEpochMs
    }
    get dmStreamModel(): DmStreamModel {
        return this.dmStreamsView.get(this.streamId)
    }

    constructor(
        streamId: string,
        private dmStreamsView: DmStreamsView,
    ) {
        super()
        this.streamId = streamId
    }

    applySnapshot(
        snapshot: Snapshot,
        content: DmChannelPayload_Snapshot,
        _cleartexts: Record<string, Uint8Array | string> | undefined,
        _encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ): void {
        if (content.inception) {
            this.dmStreamsView.setParticipants(
                this.streamId,
                userIdFromAddress(content.inception.firstPartyAddress),
                userIdFromAddress(content.inception.secondPartyAddress),
            )
        }
    }

    appendEvent(
        event: RemoteTimelineEvent,
        cleartext: Uint8Array | string | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.case === 'dmChannelPayload')
        const payload: DmChannelPayload = event.remoteEvent.event.payload.value
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

            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }

    prependEvent(
        event: RemoteTimelineEvent,
        cleartext: Uint8Array | string | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        _stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.case === 'dmChannelPayload')
        const payload: DmChannelPayload = event.remoteEvent.event.payload.value
        switch (payload.content.case) {
            case 'inception':
                this.updateLastEvent(event.remoteEvent, undefined)
                break
            case 'message':
                this.decryptEvent(
                    'channelMessage',
                    event,
                    payload.content.value,
                    cleartext,
                    encryptionEmitter,
                )
                this.updateLastEvent(event.remoteEvent, undefined)
                break
            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }

    onDecryptedContent(
        _eventId: string,
        _content: DecryptedContent,
        _stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        // pass
    }

    onConfirmedEvent(
        event: ConfirmedTimelineEvent,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ): void {
        super.onConfirmedEvent(event, stateEmitter, encryptionEmitter)
    }
    onAppendLocalEvent(
        event: StreamTimelineEvent,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        this.dmStreamsView.setLastEventCreatedAtEpochMs(this.streamId, event.createdAtEpochMs)
        stateEmitter?.emit('streamLatestTimestampUpdated', this.streamId)
    }

    private updateLastEvent(
        event: ParsedEvent,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ) {
        const createdAtEpochMs = event.event.createdAtEpochMs
        if (createdAtEpochMs > this.lastEventCreatedAtEpochMs) {
            this.dmStreamsView.setLastEventCreatedAtEpochMs(this.streamId, createdAtEpochMs)
            stateEmitter?.emit('streamLatestTimestampUpdated', this.streamId)
        }
    }

    participants(): Set<string> {
        if (!this.firstPartyId || !this.secondPartyId) {
            return new Set()
        }
        return new Set([this.firstPartyId, this.secondPartyId])
    }
}
