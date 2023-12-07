import TypedEmitter from 'typed-emitter'
import {
    Snapshot,
    MiniblockHeader,
    CommonPayload,
    CommonPayload_Snapshot_Solicitations,
    CommonPayload_KeySolicitation,
    CommonPayload_KeyFulfillment,
} from '@river/proto'
import { EmittedEvents } from './client'
import { ParsedEvent } from './types'
import { logNever } from './check'
import { PlainMessage } from '@bufbuild/protobuf'
import { removeCommon } from './utils'

// common payloads exist in all streams, this data structure helps aggregates them
export class StreamStateView_CommonContent {
    readonly streamId: string
    solicitations: Record<string, CommonPayload_Snapshot_Solicitations> = {}

    constructor(streamId: string) {
        this.streamId = streamId
    }

    initialize(snapshot: Snapshot, emitter: TypedEmitter<EmittedEvents> | undefined): void {
        if (!snapshot.common) {
            return
        }
        this.solicitations = snapshot.common.solicitations
        for (const [userId, solicitation] of Object.entries(this.solicitations)) {
            for (const event of solicitation.events) {
                emitter?.emit('newKeySolicitation', this.streamId, userId, event)
            }
        }
    }

    onMiniblockHeader(_blockHeader: MiniblockHeader, _emitter?: TypedEmitter<EmittedEvents>): void {
        // nothing to do
    }

    prependEvent(
        _event: ParsedEvent,
        _payload: CommonPayload,
        _emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        // nothing to do
    }

    appendEvent(
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

    private applySolicitation(
        creator: string,
        solicitation: CommonPayload_KeySolicitation,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        if (!this.solicitations[creator]) {
            this.solicitations[creator] = new CommonPayload_Snapshot_Solicitations({
                events: [solicitation],
            } satisfies PlainMessage<CommonPayload_Snapshot_Solicitations>)
        } else {
            this.solicitations[creator].events = this.solicitations[creator].events.filter(
                (x) => x.deviceKey !== solicitation.deviceKey,
            )
            this.solicitations[creator].events.push(solicitation)
        }
        emitter?.emit('newKeySolicitation', this.streamId, creator, solicitation)
    }

    private applyFulfillment(
        fulfillment: CommonPayload_KeyFulfillment,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        if (this.solicitations[fulfillment.userId]) {
            for (const event of this.solicitations[fulfillment.userId].events) {
                if (event.deviceKey === fulfillment.deviceKey) {
                    fulfillment.sessionIds.sort()
                    event.sessionIds = removeCommon(event.sessionIds, fulfillment.sessionIds)
                    event.isNewDevice = false
                    emitter?.emit(
                        'updatedKeySolicitation',
                        this.streamId,
                        fulfillment.userId,
                        event,
                    )
                    break
                }
            }
        }
    }
}
