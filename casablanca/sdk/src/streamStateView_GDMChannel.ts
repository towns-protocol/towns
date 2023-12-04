import TypedEmitter from 'typed-emitter'
import {
    GdmChannelPayload,
    GdmChannelPayload_Inception,
    GdmChannelPayload_Snapshot,
    Snapshot,
    MiniblockHeader,
} from '@river/proto'
import { EmittedEvents } from './client'
import { StreamStateView_IContent } from './streamStateView_IContent'
import { StreamStateView_Membership } from './streamStateView_Membership'
import { ParsedEvent } from './types'
import { logNever } from './check'

export class StreamStateView_GDMChannel implements StreamStateView_IContent {
    readonly streamId: string
    readonly memberships: StreamStateView_Membership
    lastEventCreatedAtEpocMs = 0n

    constructor(userId: string, inception: GdmChannelPayload_Inception) {
        this.memberships = new StreamStateView_Membership(userId, inception.streamId)
        this.streamId = inception.streamId
    }

    initialize(
        snapshot: Snapshot,
        content: GdmChannelPayload_Snapshot,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        this.memberships.initialize(content.memberships, emitter)
    }

    onMiniblockHeader(blockHeader: MiniblockHeader, emitter?: TypedEmitter<EmittedEvents>): void {
        this.memberships.onMiniblockHeader(blockHeader, emitter)
    }

    prependEvent(
        event: ParsedEvent,
        payload: GdmChannelPayload,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        switch (payload.content.case) {
            case 'inception':
                this.updateLastEvent(event)
                break
            case 'message':
                emitter?.emit('newEncryptedContent', this.streamId, event.hashStr, {
                    kind: 'channelMessage',
                    content: payload.content.value,
                })
                break
            case 'membership':
                // nothing to do, membership was conveyed in the snapshot
                break
            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }

    appendEvent(
        event: ParsedEvent,
        payload: GdmChannelPayload,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        switch (payload.content.case) {
            case 'inception':
                this.updateLastEvent(event)
                break
            case 'message':
                emitter?.emit('newEncryptedContent', this.streamId, event.hashStr, {
                    kind: 'channelMessage',
                    content: payload.content.value,
                })
                this.updateLastEvent(event)
                break
            case 'membership':
                this.memberships.appendMembershipEvent(
                    event.hashStr,
                    payload.content.value,
                    emitter,
                )
                break
            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }

    private updateLastEvent(event: ParsedEvent) {
        const createdAtEpocMs = event.event.createdAtEpocMs
        this.lastEventCreatedAtEpocMs =
            createdAtEpocMs > this.lastEventCreatedAtEpocMs
                ? createdAtEpocMs
                : this.lastEventCreatedAtEpocMs
    }

    participants(): Set<string> {
        return new Set([
            ...this.memberships.joinedUsers,
            ...this.memberships.invitedUsers,
            ...this.memberships.leftUsers,
        ])
    }

    // For GDMs, users must be able to see the messages before joining,
    // but not after leaving.
    joinedOrInvitedParticipants(): Set<string> {
        return new Set([...this.memberships.joinedUsers, ...this.memberships.invitedUsers])
    }
}
