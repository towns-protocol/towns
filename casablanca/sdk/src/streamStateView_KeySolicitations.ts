import TypedEmitter from 'typed-emitter'
import { ParsedEvent } from './types'
import { ChannelPayload, DmChannelPayload, GdmChannelPayload } from '@river/proto'
import { EmittedEvents } from './client'
import { bin_toString } from './binary'

type KeySolicitationPayloadTypes = ChannelPayload | DmChannelPayload | GdmChannelPayload
export class StreamStateView_KeySolicitations {
    readonly streamId: string
    readonly keySolicitations = new Set<string>()
    // origin event hash -> set of sessionIds fulfilled
    readonly fulfillments = new Map<string, Set<string>>()

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
        // only refrain from emitting a keySolicitation message if that message has been fulfilled
        // with the requested sessionId.
        if (this.fulfillments.has(event.hashStr)) {
            const fulfillmentSet = this.fulfillments.get(event.hashStr)
            if (fulfillmentSet && fulfillmentSet.has(payload.content.value.sessionId)) {
                return
            }
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
        payload: KeySolicitationPayloadTypes,
        _emitter: TypedEmitter<EmittedEvents> | undefined,
    ) {
        if (payload.content.value === undefined || payload.content.case !== 'fulfillment') {
            return
        }
        const key = bin_toString(payload.content.value.originHash)
        if (this.fulfillments.has(key)) {
            const fulfillmentSet = this.fulfillments.get(key)
            payload.content.value.sessionIds.map((s) => fulfillmentSet?.add(s))
        } else {
            this.fulfillments.set(key, new Set(payload.content.value.sessionIds))
        }
    }

    hasKeySolicitation(senderKey: string, sessionId: string) {
        const key = this.generateKey(senderKey, sessionId)
        return this.keySolicitations.has(key)
    }

    fulfilledSessions(originHash: string): string[] | undefined {
        const payload = this.fulfillments.get(originHash)
        return payload ? Array.from(payload) : undefined
    }
}
