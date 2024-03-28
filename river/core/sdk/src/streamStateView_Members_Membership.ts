import TypedEmitter from 'typed-emitter'
import { MemberPayload_Membership, MembershipOp } from '@river-build/proto'
import { logNever } from './check'
import { StreamStateEvents } from './streamEvents'

export class StreamStateView_Members_Membership {
    readonly joinedUsers = new Set<string>()
    readonly invitedUsers = new Set<string>()
    readonly leftUsers = new Set<string>()
    readonly pendingJoinedUsers = new Set<string>()
    readonly pendingInvitedUsers = new Set<string>()
    readonly pendingLeftUsers = new Set<string>()
    readonly pendingMembershipEvents = new Map<string, MemberPayload_Membership>()

    constructor(readonly streamId: string) {}

    /**
     * If no userId is provided, checks current user
     */
    isMemberJoined(userId: string): boolean {
        return this.joinedUsers.has(userId)
    }

    /**
     * If no userId is provided, checks current user
     */
    isMember(membership: MembershipOp, userId: string): boolean {
        switch (membership) {
            case MembershipOp.SO_INVITE:
                return this.invitedUsers.has(userId)
            case MembershipOp.SO_JOIN:
                return this.joinedUsers.has(userId)
            case MembershipOp.SO_LEAVE:
                return !this.invitedUsers.has(userId) && !this.joinedUsers.has(userId)
            case MembershipOp.SO_UNSPECIFIED:
                return false
            default:
                logNever(membership)
                return false
        }
    }

    participants(): Set<string> {
        return new Set([...this.joinedUsers, ...this.invitedUsers, ...this.leftUsers])
    }

    joinedParticipants(): Set<string> {
        return this.joinedUsers
    }

    joinedOrInvitedParticipants(): Set<string> {
        return new Set([...this.joinedUsers, ...this.invitedUsers])
    }

    applyMembershipEvent(
        userId: string,
        op: MembershipOp,
        type: 'pending' | 'confirmed',
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ) {
        switch (op) {
            case MembershipOp.SO_INVITE:
                if (type === 'confirmed') {
                    this.pendingInvitedUsers.delete(userId)
                    if (this.invitedUsers.add(userId)) {
                        stateEmitter?.emit('streamNewUserInvited', this.streamId, userId)
                        this.emitMembershipChange(userId, stateEmitter, this.streamId)
                    }
                } else {
                    if (this.pendingInvitedUsers.add(userId)) {
                        stateEmitter?.emit('streamPendingMembershipUpdated', this.streamId, userId)
                    }
                }
                break
            case MembershipOp.SO_JOIN:
                if (type === 'confirmed') {
                    this.pendingJoinedUsers.delete(userId)
                    if (this.joinedUsers.add(userId)) {
                        stateEmitter?.emit('streamNewUserJoined', this.streamId, userId)
                        this.emitMembershipChange(userId, stateEmitter, this.streamId)
                    }
                } else {
                    if (this.pendingJoinedUsers.add(userId)) {
                        stateEmitter?.emit('streamPendingMembershipUpdated', this.streamId, userId)
                    }
                }
                break
            case MembershipOp.SO_LEAVE:
                if (type === 'confirmed') {
                    const wasJoined = this.joinedUsers.delete(userId)
                    const wasInvited = this.invitedUsers.delete(userId)
                    this.pendingLeftUsers.delete(userId)
                    this.leftUsers.add(userId)
                    if (wasJoined || wasInvited) {
                        stateEmitter?.emit('streamUserLeft', this.streamId, userId)
                        this.emitMembershipChange(userId, stateEmitter, this.streamId)
                    }
                } else {
                    if (this.pendingLeftUsers.add(userId)) {
                        stateEmitter?.emit('streamPendingMembershipUpdated', this.streamId, userId)
                    }
                }
                break
            case MembershipOp.SO_UNSPECIFIED:
                break
            default:
                logNever(op)
        }
    }

    private emitMembershipChange(
        userId: string,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
        streamId: string,
    ) {
        stateEmitter?.emit('streamMembershipUpdated', streamId, userId)
    }
}
