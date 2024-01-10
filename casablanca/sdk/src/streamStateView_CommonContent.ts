import TypedEmitter from 'typed-emitter'
import {
    Snapshot,
    CommonPayload,
    CommonPayload_KeySolicitation,
    CommonPayload_KeyFulfillment,
} from '@river/proto'
import { EmittedEvents } from './client'
import { ConfirmedTimelineEvent, KeySolicitationContent, ParsedEvent } from './types'
import { removeCommon } from './utils'
import { logNever } from '@river/mecholm'

// common payloads exist in all streams, this data structure helps aggregates them
export class StreamStateView_CommonContent {
    readonly streamId: string
    solicitations: Record<string, KeySolicitationContent[]> = {}

    constructor(streamId: string) {
        this.streamId = streamId
    }

    applySnapshot(snapshot: Snapshot, emitter: TypedEmitter<EmittedEvents> | undefined): void {
        if (!snapshot.common) {
            return
        }
        // copy protobuf over to avoid mutating the original protobuf
        this.solicitations = Object.entries(snapshot.common.solicitations).reduce((acc, kv) => {
            const [key, solicitations] = kv
            acc[key] = solicitations.events.map((s) => ({
                deviceKey: s.deviceKey,
                fallbackKey: s.fallbackKey,
                isNewDevice: s.isNewDevice,
                sessionIds: [...s.sessionIds],
            }))
            return acc
        }, {} as Record<string, KeySolicitationContent[]>)
        for (const [userId, solicitation] of Object.entries(this.solicitations)) {
            for (const event of solicitation) {
                emitter?.emit('newKeySolicitation', this.streamId, userId, event)
            }
        }
    }

    prependCommonContent(
        _event: ParsedEvent,
        _payload: CommonPayload,
        _emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        // nothing to do
    }

    appendCommonContent(
        event: ParsedEvent,
        payload: CommonPayload,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        switch (payload.content.case) {
            case 'keySolicitation':
                this.applySolicitation(event.creatorUserId, payload.content.value, emitter)
                break
            case 'keyFulfillment':
                this.applyFulfillment(payload.content.value, emitter)
                break
            case undefined:
                break
            default:
                logNever(payload.content, 'missing case')
        }
    }

    onConfirmedEvent(
        _event: ConfirmedTimelineEvent,
        _emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        // nothing to do
    }

    private applySolicitation(
        creator: string,
        solicitation: CommonPayload_KeySolicitation,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        if (!this.solicitations[creator]) {
            this.solicitations[creator] = [
                {
                    deviceKey: solicitation.deviceKey,
                    fallbackKey: solicitation.fallbackKey,
                    isNewDevice: solicitation.isNewDevice,
                    sessionIds: [...solicitation.sessionIds],
                },
            ]
        } else {
            this.solicitations[creator] = this.solicitations[creator].filter(
                (x) => x.deviceKey !== solicitation.deviceKey,
            )
            this.solicitations[creator].push(solicitation)
        }
        emitter?.emit('newKeySolicitation', this.streamId, creator, solicitation)
    }

    private applyFulfillment(
        fulfillment: CommonPayload_KeyFulfillment,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        const index = this.solicitations[fulfillment.userId]?.findIndex(
            (x) => x.deviceKey === fulfillment.deviceKey,
        )
        if (index === undefined || index === -1) {
            return
        }
        const prev = this.solicitations[fulfillment.userId][index]
        const newEvent = {
            deviceKey: prev.deviceKey,
            fallbackKey: prev.fallbackKey,
            isNewDevice: false,
            sessionIds: [...removeCommon(prev.sessionIds, fulfillment.sessionIds)],
        }
        this.solicitations[fulfillment.userId][index] = newEvent
        emitter?.emit('updatedKeySolicitation', this.streamId, fulfillment.userId, newEvent)
    }
}
