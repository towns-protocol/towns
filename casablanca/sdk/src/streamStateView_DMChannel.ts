import TypedEmitter from 'typed-emitter'
import { DmChannelPayload_Snapshot, Snapshot, DmChannelPayload } from '@river/proto'
import { StreamStateView_AbstractContent } from './streamStateView_AbstractContent'
import {
    ConfirmedTimelineEvent,
    ParsedEvent,
    RemoteTimelineEvent,
    StreamTimelineEvent,
} from './types'
import { StreamStateView_UserMetadata } from './streamStateView_UserMetadata'
import { DecryptedContent } from './encryptedContentTypes'
import { StreamEncryptionEvents, StreamStateEvents } from './streamEvents'
import { check } from '@river/dlog'
import { logNever } from './check'
import { userIdFromAddress } from './id'

export class StreamStateView_DMChannel extends StreamStateView_AbstractContent {
    readonly streamId: string
    readonly userMetadata: StreamStateView_UserMetadata
    firstPartyId?: string
    secondPartyId?: string
    lastEventCreatedAtEpocMs = 0n

    constructor(userId: string, streamId: string) {
        super()
        this.userMetadata = new StreamStateView_UserMetadata(userId, streamId)
        this.streamId = streamId
    }

    applySnapshot(
        snapshot: Snapshot,
        content: DmChannelPayload_Snapshot,
        cleartexts: Record<string, string> | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ): void {
        this.userMetadata.applySnapshot(
            content.usernames,
            content.displayNames,
            cleartexts,
            encryptionEmitter,
        )
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
            case 'displayName':
            case 'username':
                // nothing to do, conveyed in the snapshot
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
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        if (content.kind === 'text') {
            this.userMetadata.onDecryptedContent(eventId, content.content, stateEmitter)
        }
    }

    onConfirmedEvent(
        event: ConfirmedTimelineEvent,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        super.onConfirmedEvent(event, stateEmitter)
        this.userMetadata.onConfirmedEvent(event, stateEmitter)
    }
    onAppendLocalEvent(
        event: StreamTimelineEvent,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        this.lastEventCreatedAtEpocMs = event.createdAtEpocMs
        stateEmitter?.emit('streamLatestTimestampUpdated', this.streamId)
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

    getUserMetadata(): StreamStateView_UserMetadata {
        return this.userMetadata
    }

    participants(): Set<string> {
        if (!this.firstPartyId || !this.secondPartyId) {
            return new Set()
        }
        return new Set([this.firstPartyId, this.secondPartyId])
    }
}
