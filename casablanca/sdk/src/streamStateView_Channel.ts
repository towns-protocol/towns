import TypedEmitter from 'typed-emitter'
import { StreamStateView_Membership } from './streamStateView_Membership'
import { ParsedEvent } from './types'
import { EmittedEvents } from './client'
import { ChannelPayload, ChannelPayload_Inception } from '@river/proto'
import { RiverEvent } from './event'
import { userIdFromAddress } from './id'
import { checkNever } from './check'

export type ChannelPayloadCaseType = ChannelPayload['content']['case']
export type ChannelPayloadValueType = ChannelPayload['content']['value']

export type ChannelPayloadWith<
    s extends ChannelPayloadCaseType,
    T extends ChannelPayloadValueType,
> = Omit<ChannelPayload, 'content'> & { content: { case: s; value: T } }

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

    appendEvent(
        event: ParsedEvent,
        payload: ChannelPayload,
        emitter?: TypedEmitter<EmittedEvents>,
    ): void {
        switch (payload.content.case) {
            case 'inception':
                emitter?.emit('channelInception', this.streamId, event.event, payload.content.value)
                break
            case 'message':
                {
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
                checkNever(payload.content)
        }
    }
}
