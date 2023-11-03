import TypedEmitter from 'typed-emitter'
import { StreamStateView_Membership } from './streamStateView_Membership'
import { ParsedEvent } from './types'
import { EmittedEvents } from './client'
import {
    ChannelPayload,
    ChannelPayload_Inception,
    ChannelPayload_Snapshot,
    MiniblockHeader,
    Snapshot,
} from '@river/proto'
import { logNever } from './check'
import { StreamStateView_IContent } from './streamStateView_IContent'
import { StreamStateView_Messages } from './streamStateView_Messages'

export class StreamStateView_Channel implements StreamStateView_IContent {
    readonly streamId: string
    readonly spaceId?: string
    readonly memberships: StreamStateView_Membership
    readonly messages: StreamStateView_Messages
    readonly keySolicitations = new Set<{
        senderKey: string
        sessionId: string
        streamId: string
    }>()
    readonly fulfillments = new Map<string, ParsedEvent>()

    constructor(userId: string, inception: ChannelPayload_Inception) {
        this.memberships = new StreamStateView_Membership(userId, inception.streamId)
        this.messages = new StreamStateView_Messages(inception.streamId, inception.spaceId)
        this.streamId = inception.streamId
        this.spaceId = inception.spaceId
    }

    initialize(
        snapshot: Snapshot,
        content: ChannelPayload_Snapshot,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        this.memberships.initialize(content.memberships, emitter)
    }

    onMiniblockHeader(blockHeader: MiniblockHeader, emitter?: TypedEmitter<EmittedEvents>): void {
        this.memberships.onMiniblockHeader(blockHeader, emitter)
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
                this.messages.addChannelMessage(event, emitter)
                break
            case 'membership':
                // nothing to do, membership was conveyed in the snapshot
                break
            case 'fulfillment':
                this.fulfillments.set(event.hashStr, event)
                break
            case 'keySolicitation':
                this.addKeySolicitationMessage(event, payload, emitter)
                break
            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }

    private addKeySolicitationMessage(
        event: ParsedEvent,
        payload: ChannelPayload,
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
        this.keySolicitations.add({
            senderKey: payload.content.value.senderKey,
            sessionId: payload.content.value.sessionId,
            streamId: this.streamId,
        })
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
                this.messages.addChannelMessage(event, emitter)
                break
            case 'membership':
                this.memberships.appendMembershipEvent(
                    event.hashStr,
                    payload.content.value,
                    emitter,
                )
                break
            case 'fulfillment':
                this.fulfillments.set(event.hashStr, event)
                break
            case 'keySolicitation':
                this.addKeySolicitationMessage(event, payload, emitter)
                break
            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }
}
