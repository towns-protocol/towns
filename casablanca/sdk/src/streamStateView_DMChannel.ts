import TypedEmitter from 'typed-emitter'
import { DmChannelPayload_Snapshot, Snapshot, DmChannelPayload } from '@river/proto'
import { StreamStateView_AbstractContent } from './streamStateView_AbstractContent'
import { StreamStateView_Membership } from './streamStateView_Membership'
import { ConfirmedTimelineEvent, ParsedEvent, RemoteTimelineEvent } from './types'
import { StreamStateView_UserMetadata } from './streamStateView_UserMetadata'
import { DecryptedContent } from './encryptedContentTypes'
import { StreamEncryptionEvents, StreamStateEvents } from './streamEvents'
import { check, logNever } from '@river/waterproof'

export class StreamStateView_DMChannel extends StreamStateView_AbstractContent {
    readonly streamId: string
    readonly memberships: StreamStateView_Membership
    readonly userMetadata: StreamStateView_UserMetadata
    firstPartyId?: string
    secondPartyId?: string
    lastEventCreatedAtEpocMs = 0n

    constructor(userId: string, streamId: string) {
        super()
        this.memberships = new StreamStateView_Membership(userId, streamId)
        this.userMetadata = new StreamStateView_UserMetadata(userId, streamId)
        this.streamId = streamId
    }

    applySnapshot(
        snapshot: Snapshot,
        content: DmChannelPayload_Snapshot,
        cleartexts: Record<string, string> | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ): void {
        this.memberships.applySnapshot(content.memberships, encryptionEmitter)
        this.userMetadata.applySnapshot(
            content.usernames,
            content.displayNames,
            cleartexts,
            encryptionEmitter,
        )
        this.firstPartyId = content.inception?.firstPartyId
        this.secondPartyId = content.inception?.secondPartyId
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
                this.updateLastEvent(event.remoteEvent)
                break

            case 'message':
                this.decryptEvent(
                    'channelMessage',
                    event,
                    payload.content.value,
                    cleartext,
                    encryptionEmitter,
                )
                this.updateLastEvent(event.remoteEvent)
                break

            case 'membership':
                this.memberships.appendMembershipEvent(
                    event.hashStr,
                    payload.content.value,
                    encryptionEmitter,
                )
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
                this.updateLastEvent(event.remoteEvent)
                break
            case 'message':
                this.decryptEvent(
                    'channelMessage',
                    event,
                    payload.content.value,
                    cleartext,
                    encryptionEmitter,
                )
                break
            case 'membership':
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

    private updateLastEvent(event: ParsedEvent) {
        const createdAtEpocMs = event.event.createdAtEpocMs
        this.lastEventCreatedAtEpocMs =
            createdAtEpocMs > this.lastEventCreatedAtEpocMs
                ? createdAtEpocMs
                : this.lastEventCreatedAtEpocMs
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
