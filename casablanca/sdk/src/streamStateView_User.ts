import TypedEmitter from 'typed-emitter'
import { ParsedEvent, RemoteTimelineEvent } from './types'
import {
    MembershipOp,
    Snapshot,
    UserPayload,
    UserPayload_Snapshot,
    UserPayload_UserMembership,
} from '@river/proto'
import { StreamEncryptionEvents, StreamEvents, StreamStateEvents } from './streamEvents'
import { StreamStateView_AbstractContent } from './streamStateView_AbstractContent'
import { StreamStateView_UserStreamMembership } from './streamStateView_Membership'
import { check } from '@river/dlog'
import { logNever } from './check'

export class StreamStateView_User extends StreamStateView_AbstractContent {
    readonly streamId: string
    readonly memberships: StreamStateView_UserStreamMembership
    readonly streamMemberships: { [key: string]: UserPayload_UserMembership } = {}
    readonly toDeviceMessages: ParsedEvent[] = []

    constructor(streamId: string) {
        super()
        this.streamId = streamId
        this.memberships = new StreamStateView_UserStreamMembership(streamId)
    }

    applySnapshot(
        snapshot: Snapshot,
        content: UserPayload_Snapshot,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ): void {
        // initialize memberships
        for (const [_, payload] of Object.entries(content.memberships)) {
            this.addUserPayload_userMembership(payload, encryptionEmitter)
        }
    }

    prependEvent(
        event: RemoteTimelineEvent,
        _cleartext: string | undefined,
        _encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        _stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
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
        _encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.case === 'userPayload')
        const payload: UserPayload = event.remoteEvent.event.payload.value
        switch (payload.content.case) {
            case 'inception':
                break
            case 'userMembership':
                this.addUserPayload_userMembership(payload.content.value, stateEmitter)
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
        const wasInvited = this.streamMemberships[streamId]?.op === MembershipOp.SO_INVITE
        const wasJoined = this.streamMemberships[streamId]?.op === MembershipOp.SO_JOIN
        this.streamMemberships[streamId] = payload
        switch (op) {
            case MembershipOp.SO_INVITE:
                emitter?.emit('userInvitedToStream', streamId)
                break
            case MembershipOp.SO_JOIN:
                emitter?.emit('userJoinedStream', streamId)
                break
            case MembershipOp.SO_LEAVE:
                {
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

    isMember(streamId: string, membership: MembershipOp): boolean {
        return this.streamMemberships[streamId]?.op === membership
    }
}
