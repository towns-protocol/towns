import TypedEmitter from 'typed-emitter'
import { DmChannelPayload_Snapshot, Snapshot, DmChannelPayload } from '@river-build/proto'
import { StreamStateView_AbstractContent } from './streamStateView_AbstractContent'
import {
    ConfirmedTimelineEvent,
    ParsedEvent,
    RemoteTimelineEvent,
    StreamTimelineEvent,
} from './types'
import { DecryptedContent } from './encryptedContentTypes'
import { StreamEncryptionEvents, StreamStateEvents } from './streamEvents'
import { check } from '@river-build/dlog'
import { logNever } from './check'
import { userIdFromAddress } from './id'

export class StreamStateView_DMChannel extends StreamStateView_AbstractContent {
    readonly streamId: string
    firstPartyId?: string
    secondPartyId?: string
    lastEventCreatedAtEpochMs = 0n

    constructor(streamId: string) {
        super()
        this.streamId = streamId
    }

    applySnapshot(
        snapshot: Snapshot,
        content: DmChannelPayload_Snapshot,
        _cleartexts: Record<string, string> | undefined,
        _encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ): void {
        if (content.inception) {
            this.firstPartyId = userIdFromAddress(content.inception.firstPartyAddress)
            this.secondPartyId = userIdFromAddress(content.inception.secondPartyAddress)
        }
    }

    appendEvent(
        event: RemoteTimelineEvent,
        cleartext: string | undefined,
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
        cleartext: string | undefined,
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
                this.updateLastEvent(event.remoteEvent, undefined)
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
    ): void {
        super.onConfirmedEvent(event, stateEmitter)
    }
    onAppendLocalEvent(
        event: StreamTimelineEvent,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        this.lastEventCreatedAtEpochMs = event.createdAtEpochMs
        stateEmitter?.emit('streamLatestTimestampUpdated', this.streamId)
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

    participants(): Set<string> {
        if (!this.firstPartyId || !this.secondPartyId) {
            return new Set()
        }
        return new Set([this.firstPartyId, this.secondPartyId])
    }
}
