import TypedEmitter from 'typed-emitter'
import { ParsedEvent } from './types'
import { ChannelPayload, DmChannelPayload, GdmChannelPayload } from '@river/proto'
import { EmittedEvents } from './client'

export class StreamStateView_KeySolicitations {
    readonly streamId: string
    readonly keySolicitations = new Set<string>()
    readonly fulfillments = new Map<string, ParsedEvent>()

    constructor(streamId: string) {
        this.streamId = streamId
    }

    private generateKey(senderKey: string, sessionId: string) {
        return `${senderKey}:${sessionId}`
    }

    addKeySolicitationMessage(
        event: ParsedEvent,
        payload: ChannelPayload | DmChannelPayload | GdmChannelPayload,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ) {
        if (payload.content.value === undefined || payload.content.case !== 'keySolicitation') {
            return
        }
        if (this.fulfillments.has(event.hashStr)) {
            return
        }
        emitter?.emit(
            'keySolicitationMessage',
            this.streamId,
            payload.content.value,
            event.hashStr,
            event.creatorUserId,
        )
        const key = this.generateKey(
            payload.content.value.senderKey,
            payload.content.value.sessionId,
        )

        this.keySolicitations.add(key)
    }

    addKeyFulfillmentMessage(
        event: ParsedEvent,
        _payload: ChannelPayload | DmChannelPayload | GdmChannelPayload,
        _emitter: TypedEmitter<EmittedEvents> | undefined,
    ) {
        this.fulfillments.set(event.hashStr, event)
    }

    hasKeySolicitation(senderKey: string, sessionId: string) {
        const key = this.generateKey(senderKey, sessionId)
        return this.keySolicitations.has(key)
    }
}
