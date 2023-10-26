import TypedEmitter from 'typed-emitter'
import {
    MiniblockHeader,
    DmChannelPayload_Inception,
    DmChannelPayload_Snapshot,
    Snapshot,
    DmChannelPayload,
} from '@river/proto'
import { EmittedEvents } from './client'
import { StreamStateView_IContent } from './streamStateView_IContent'
import { StreamStateView_Membership } from './streamStateView_Membership'
import { ParsedEvent } from './types'
import { logNever } from './check'
import { userIdFromAddress } from './id'
import { RiverEvent } from './event'

export class StreamStateView_DMChannel implements StreamStateView_IContent {
    readonly streamId: string
    readonly memberships: StreamStateView_Membership
    readonly messages = new Map<string, ParsedEvent>()
    readonly receipts = new Map<string, ParsedEvent>()
    readonly firstPartyId: string
    readonly secondPartyId: string
    lastEventCreatedAtEpocMs = 0n

    constructor(userId: string, inception: DmChannelPayload_Inception) {
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

    onMiniblockHeader(blockHeader: MiniblockHeader, emitter?: TypedEmitter<EmittedEvents>): void {
        this.memberships.onMiniblockHeader(blockHeader, emitter)
    }

    appendEvent(
        event: ParsedEvent,
        payload: DmChannelPayload,
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
    prependEvent(
        event: ParsedEvent,
        payload: DmChannelPayload,
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

    private addChannelMessage(
        event: ParsedEvent,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ) {
        this.messages.set(event.hashStr, event)

        const createdAtEpocMs = event.event.createdAtEpocMs
        this.lastEventCreatedAtEpocMs =
            createdAtEpocMs > this.lastEventCreatedAtEpocMs
                ? createdAtEpocMs
                : this.lastEventCreatedAtEpocMs
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
        return new Set([this.firstPartyId, this.secondPartyId])
    }
}
