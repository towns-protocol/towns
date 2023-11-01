import TypedEmitter from 'typed-emitter'
import { ParsedEvent } from './types'
import { RiverEventV2 } from './eventV2'
import { EmittedEvents } from './client'

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
        if (
            event?.event?.payload.case != 'channelPayload' ||
            event.event.payload.value.content.case != 'message'
        ) {
            throw new Error(`addChannelMessage: event is not a channel message`)
        }
        const content = event.event.payload.value.content.value
        const riverEvent = new RiverEventV2(
            {
                channel_id: this.streamId,
                event_id: event.hashStr,
                stream_id: this.streamId,
                content: content,
            },
            emitter,
            event,
        )
        emitter?.emit('channelNewMessage', this.streamId, riverEvent)
    }
}
