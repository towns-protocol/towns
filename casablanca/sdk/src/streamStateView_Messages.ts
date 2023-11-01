import TypedEmitter from 'typed-emitter'
import { ParsedEvent } from './types'
import { RiverEvent } from './event'
import { EmittedEvents } from './client'
import { userIdFromAddress } from './id'

export class StreamStateView_Messages {
    readonly streamId: string
    readonly spaceId?: string
    readonly state = new Map<string, ParsedEvent>()
    constructor(streamId: string, spaceId?: string) {
        this.streamId = streamId
        this.spaceId = spaceId
    }

    addChannelMessage(event: ParsedEvent, emitter: TypedEmitter<EmittedEvents> | undefined) {
        this.state.set(event.hashStr, event)
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
            event,
        )
        emitter?.emit('channelNewMessage', this.streamId, riverEvent)
    }
}
