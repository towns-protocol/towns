import TypedEmitter from 'typed-emitter'
import { ParsedEvent, RemoteTimelineEvent } from './types'
import { EmittedEvents } from './client'
import {
    MembershipOp,
    Snapshot,
    UserPayload,
    UserPayload_Inception,
    UserPayload_Snapshot,
    UserPayload_UserMembership,
} from '@river/proto'
import { check, logNever } from './check'
import { StreamEvents } from './streamEvents'
import { StreamStateView_IContent } from './streamStateView_IContent'
import { StreamStateView_UserStreamMembership } from './streamStateView_Membership'

export class StreamStateView_User extends StreamStateView_IContent {
    readonly streamId: string
    readonly memberships: StreamStateView_UserStreamMembership
    readonly userInvitedStreams = new Set<string>()
    readonly userJoinedStreams = new Set<string>()
    readonly toDeviceMessages: ParsedEvent[] = []

    constructor(inception: UserPayload_Inception) {
        super()
        this.streamId = inception.streamId
        this.memberships = new StreamStateView_UserStreamMembership(inception.streamId)
    }

    initialize(
        snapshot: Snapshot,
        content: UserPayload_Snapshot,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        // initialize memberships
        for (const [_, payload] of Object.entries(content.memberships)) {
            this.addUserPayload_userMembership(payload, emitter)
        }
    }

    prependEvent(
        event: RemoteTimelineEvent,
        _cleartext: string | undefined,
        _emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.case === 'userPayload')
        const payload: UserPayload = event.remoteEvent.event.payload.value
        switch (payload.content.case) {
            case 'inception':
                break
            case 'userMembership':
                // memberships are handled in the snapshot
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
        check(event.remoteEvent.event.payload.case === 'userPayload')
        const payload: UserPayload = event.remoteEvent.event.payload.value
        switch (payload.content.case) {
            case 'inception':
                break
            case 'userMembership':
                this.addUserPayload_userMembership(payload.content.value, emitter)
                break
            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }

    private addUserPayload_userMembership(
        payload: UserPayload_UserMembership,
        emitter: TypedEmitter<StreamEvents> | undefined,
    ): void {
        const { op, streamId } = payload
        switch (op) {
            case MembershipOp.SO_INVITE:
                this.userInvitedStreams.add(streamId)
                emitter?.emit('userInvitedToStream', streamId)
                break
            case MembershipOp.SO_JOIN:
                this.userJoinedStreams.add(streamId)
                emitter?.emit('userJoinedStream', streamId)
                break
            case MembershipOp.SO_LEAVE:
                {
                    const wasInvited = this.userInvitedStreams.delete(streamId)
                    const wasJoined = this.userJoinedStreams.delete(streamId)
                    if (wasInvited || wasJoined) {
                        emitter?.emit('userLeftStream', streamId)
                    }
                }
                break
            case MembershipOp.SO_UNSPECIFIED:
                break
            default:
                logNever(op)
        }
    }
}
