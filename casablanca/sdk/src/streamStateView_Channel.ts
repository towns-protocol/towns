import TypedEmitter from 'typed-emitter'
import { StreamStateView_Membership } from './streamStateView_Membership'
import { RemoteTimelineEvent } from './types'
import { EmittedEvents } from './client'
import {
    ChannelPayload,
    ChannelPayload_Inception,
    ChannelPayload_Snapshot,
    MiniblockHeader,
    Snapshot,
} from '@river/proto'
import { check, logNever } from './check'
import { StreamStateView_IContent } from './streamStateView_IContent'

export class StreamStateView_Channel extends StreamStateView_IContent {
    readonly streamId: string
    readonly spaceId?: string
    readonly memberships: StreamStateView_Membership

    constructor(userId: string, inception: ChannelPayload_Inception) {
        super()
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
        event: RemoteTimelineEvent,
        cleartext: string | undefined,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.case === 'channelPayload')
        const payload: ChannelPayload = event.remoteEvent.event.payload.value
        switch (payload.content.case) {
            case 'inception':
                break
            case 'message':
                this.decryptEvent(
                    'channelMessage',
                    event,
                    payload.content.value,
                    cleartext,
                    emitter,
                )
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
        event: RemoteTimelineEvent,
        cleartext: string | undefined,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.case === 'channelPayload')
        const payload: ChannelPayload = event.remoteEvent.event.payload.value
        switch (payload.content.case) {
            case 'inception':
                break
            case 'message':
                this.decryptEvent(
                    'channelMessage',
                    event,
                    payload.content.value,
                    cleartext,
                    emitter,
                )
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
