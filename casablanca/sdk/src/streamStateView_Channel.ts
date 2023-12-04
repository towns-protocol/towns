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

export class StreamStateView_Channel implements StreamStateView_IContent {
    readonly streamId: string
    readonly spaceId?: string
    readonly memberships: StreamStateView_Membership

    constructor(userId: string, inception: ChannelPayload_Inception) {
        this.memberships = new StreamStateView_Membership(userId, inception.streamId)
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
                emitter?.emit('newEncryptedContent', this.streamId, event.hashStr, {
                    kind: 'channelMessage',
                    content: payload.content.value,
                })
                break
            case 'membership':
                // nothing to do, membership was conveyed in the snapshot
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
                emitter?.emit('newEncryptedContent', this.streamId, event.hashStr, {
                    kind: 'channelMessage',
                    content: payload.content.value,
                })
                break
            case 'membership':
                this.memberships.appendMembershipEvent(
                    event.hashStr,
                    payload.content.value,
                    emitter,
                )
                break
            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }
}
