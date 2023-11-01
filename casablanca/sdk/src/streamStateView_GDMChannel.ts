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
import { RiverEvent } from './event'
import { ParsedEvent } from './types'
import { userIdFromAddress } from './id'
import { logNever } from './check'

export class StreamStateView_GDMChannel implements StreamStateView_IContent {
    readonly streamId: string
    readonly memberships: StreamStateView_Membership
    readonly messages = new Map<string, ParsedEvent>()
    readonly receipts = new Map<string, ParsedEvent>()
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
                break
            case 'message':
                this.addChannelMessage(event, emitter)
                break
            case 'membership':
                // nothing to do, membership was conveyed in the snapshot
                break
            case 'receipt':
                this.receipts.set(event.hashStr, event)
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
                break
            case 'message':
                this.addChannelMessage(event, emitter)
                break
            case 'membership':
                this.memberships.appendMembershipEvent(
                    event.hashStr,
                    payload.content.value,
                    emitter,
                )
                break
            case 'receipt':
                this.receipts.set(event.hashStr, event)
                break
            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }

    private addChannelMessage(
        event: ParsedEvent,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ) {
        const createdAtEpocMs = event.event.createdAtEpocMs
        this.lastEventCreatedAtEpocMs =
            createdAtEpocMs > this.lastEventCreatedAtEpocMs
                ? createdAtEpocMs
                : this.lastEventCreatedAtEpocMs
        this.messages.set(event.hashStr, event)
        const riverEvent = new RiverEvent(
            {
                channel_id: this.streamId,
                payload: {
                    parsed_event: event.event.payload,
                    creator_user_id: userIdFromAddress(event.event.creatorAddress),
                    hash_str: event.hashStr,
                    stream_id: this.streamId,
                },
            },
            emitter,
            event,
        )
        emitter?.emit('channelNewMessage', this.streamId, riverEvent)
    }

    participants(): Set<string> {
        return new Set([
            ...this.memberships.joinedUsers,
            ...this.memberships.invitedUsers,
            ...this.memberships.leftUsers,
        ])
    }
}
