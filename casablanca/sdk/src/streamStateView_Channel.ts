import TypedEmitter from 'typed-emitter'
import { StreamStateView_Membership } from './streamStateView_Membership'
import { ParsedEvent } from './types'
import { EmittedEvents } from './client'
import {
    ChannelPayload,
    ChannelPayload_Inception,
    ChannelPayload_Snapshot,
    Snapshot,
} from '@river/proto'
import { RiverEvent } from './event'
import { userIdFromAddress } from './id'
import { logNever } from './check'

export class StreamStateView_Channel {
    readonly streamId: string
    readonly spaceId?: string
    readonly memberships = new StreamStateView_Membership()
    readonly messages = new Map<string, ParsedEvent>()
    readonly receipts = new Map<string, ParsedEvent>()

    constructor(inception: ChannelPayload_Inception) {
        this.streamId = inception.streamId
        this.spaceId = inception.spaceId
    }

    initialize(
        snapshot: Snapshot,
        content: ChannelPayload_Snapshot,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        this.memberships.initialize(content.memberships, this.streamId, emitter)
    }

    prependEvent(
        event: ParsedEvent,
        payload: ChannelPayload,
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
        payload: ChannelPayload,
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
                    payload.content.value,
                    this.streamId,
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
        this.messages.set(event.hashStr, event)
        const riverEvent = new RiverEvent(
            {
                channel_id: this.streamId,
                space_id: this.spaceId,
                payload: {
                    parsed_event: event.event.payload,
                    creator_user_id: userIdFromAddress(event.event.creatorAddress),
                    hash_str: event.hashStr,
                    stream_id: this.streamId,
                },
            },
            emitter,
        )
        emitter?.emit('channelNewMessage', this.streamId, riverEvent)
    }
}
