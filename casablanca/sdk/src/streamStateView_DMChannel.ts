import TypedEmitter from 'typed-emitter'
import {
    DmChannelPayload_Inception,
    DmChannelPayload_Snapshot,
    Snapshot,
    DmChannelPayload,
} from '@river/proto'
import { EmittedEvents } from './client'
import { StreamStateView_IContent } from './streamStateView_IContent'
import { StreamStateView_Membership } from './streamStateView_Membership'
import { ParsedEvent, RemoteTimelineEvent } from './types'
import { check, logNever } from './check'

export class StreamStateView_DMChannel extends StreamStateView_IContent {
    readonly streamId: string
    readonly memberships: StreamStateView_Membership
    readonly firstPartyId: string
    readonly secondPartyId: string
    lastEventCreatedAtEpocMs = 0n

    constructor(userId: string, inception: DmChannelPayload_Inception) {
        super()
        this.memberships = new StreamStateView_Membership(userId, inception.streamId)
        this.streamId = inception.streamId
        this.firstPartyId = inception.firstPartyId
        this.secondPartyId = inception.secondPartyId
    }

    initialize(
        snapshot: Snapshot,
        content: DmChannelPayload_Snapshot,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        this.memberships.initialize(content.memberships, emitter)
    }

    appendEvent(
        event: RemoteTimelineEvent,
        cleartext: string | undefined,
        emitter: TypedEmitter<EmittedEvents> | undefined,
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

    prependEvent(
        event: RemoteTimelineEvent,
        cleartext: string | undefined,
        emitter: TypedEmitter<EmittedEvents> | undefined,
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

    private updateLastEvent(event: ParsedEvent) {
        const createdAtEpocMs = event.event.createdAtEpocMs
        this.lastEventCreatedAtEpocMs =
            createdAtEpocMs > this.lastEventCreatedAtEpocMs
                ? createdAtEpocMs
                : this.lastEventCreatedAtEpocMs
    }

    participants(): Set<string> {
        return new Set([this.firstPartyId, this.secondPartyId])
    }
}
