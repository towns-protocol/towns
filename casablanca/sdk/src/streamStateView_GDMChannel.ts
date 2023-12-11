import TypedEmitter from 'typed-emitter'
import {
    GdmChannelPayload,
    GdmChannelPayload_Inception,
    GdmChannelPayload_Snapshot,
    Snapshot,
} from '@river/proto'
import { EmittedEvents } from './client'
import { StreamStateView_AbstractContent } from './streamStateView_AbstractContent'
import { StreamStateView_Membership } from './streamStateView_Membership'
import { ParsedEvent, RemoteTimelineEvent } from './types'
import { check, logNever } from './check'

export class StreamStateView_GDMChannel extends StreamStateView_AbstractContent {
    readonly streamId: string
    readonly memberships: StreamStateView_Membership
    lastEventCreatedAtEpocMs = 0n

    constructor(userId: string, inception: GdmChannelPayload_Inception) {
        super()
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

    prependEvent(
        event: RemoteTimelineEvent,
        cleartext: string | undefined,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.case === 'gdmChannelPayload')
        const payload: GdmChannelPayload = event.remoteEvent.event.payload.value
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
                    emitter,
                )
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
        event: RemoteTimelineEvent,
        cleartext: string | undefined,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.case === 'gdmChannelPayload')
        const payload: GdmChannelPayload = event.remoteEvent.event.payload.value
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
                    emitter,
                )
                this.updateLastEvent(event.remoteEvent)
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
