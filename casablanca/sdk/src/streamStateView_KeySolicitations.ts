import TypedEmitter from 'typed-emitter'
import { ParsedEvent } from './types'
import { ChannelPayload, DmChannelPayload, GdmChannelPayload } from '@river/proto'
import { EmittedEvents } from './client'
import { bin_toString } from './binary'

type KeySolicitationPayloadTypes = ChannelPayload | DmChannelPayload | GdmChannelPayload
export class StreamStateView_KeySolicitations {
    readonly streamId: string
    readonly keySolicitations = new Set<string>()
    readonly fulfillments = new Map<string, KeySolicitationPayloadTypes>()

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
            const fulfillmentPayload = this.fulfillments.get(event.hashStr)
            if (
                fulfillmentPayload &&
                fulfillmentPayload.content.case == 'fulfillment' &&
                fulfillmentPayload.content.value.sessionIds.includes(
                    payload.content.value.sessionId,
                )
            ) {
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
        this.fulfillments.set(key, payload)
    }

    hasKeySolicitation(senderKey: string, sessionId: string) {
        const key = this.generateKey(senderKey, sessionId)
        return this.keySolicitations.has(key)
    }

    fulfilledSessions(originHash: string): string[] | undefined {
        const payload = this.fulfillments.get(originHash)
        if (!payload || payload.content.case !== 'fulfillment') {
            return undefined
        }
        return payload.content.value.sessionIds
    }
}
