import { Membership, MembershipOp } from '@river/proto'
import TypedEmitter from 'typed-emitter'
import { StreamEvents } from './streamEvents'
import { EmittedEvents } from './client'
import { ConfirmedTimelineEvent } from './types'
import { logNever } from '@river/mecholm'

export class StreamStateView_Membership {
    readonly userId: string
    readonly streamId: string
    readonly joinedUsers = new Set<string>()
    readonly invitedUsers = new Set<string>()
    readonly leftUsers = new Set<string>()
    readonly pendingJoinedUsers = new Set<string>()
    readonly pendingInvitedUsers = new Set<string>()
    readonly pendingLeftUsers = new Set<string>()
    readonly pendingEvents = new Map<string, Membership>()

    constructor(userId: string, streamId: string) {
        this.userId = userId
        this.streamId = streamId
    }

    applySnapshot(
        memberships: { [key: string]: Membership },
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ) {
        // iterate over map, add joined and invited users
        for (const membership of Object.values(memberships)) {
            this.applyMembershipEvent(membership, 'confirmed', emitter)
        }
    }

    onConfirmedEvent(
        event: ConfirmedTimelineEvent,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        const eventId = event.hashStr
        const payload = this.pendingEvents.get(eventId)
        if (payload) {
            this.pendingEvents.delete(eventId)
            this.applyMembershipEvent(payload, 'confirmed', emitter)
        }
    }

    /**
     * Places event in a pending queue, to be applied when the event is confirmed in a miniblock header
     */
    appendMembershipEvent(
        eventHashStr: string,
        payload: Membership,
        emitter?: TypedEmitter<EmittedEvents>,
    ): void {
        this.pendingEvents.set(eventHashStr, payload)
        this.applyMembershipEvent(payload, 'pending', emitter)
    }

    /**
     * If no userId is provided, checks current user
     */
    isMemberJoined(userId?: string): boolean {
        return this.joinedUsers.has(userId ?? this.userId)
    }

    /**
     * If no userId is provided, checks current user
     */
    isMember(membership: MembershipOp, inUserId?: string): boolean {
        const userId = inUserId ?? this.userId
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

    private applyMembershipEvent(
        payload: Membership,
        type: 'pending' | 'confirmed',
        emitter?: TypedEmitter<EmittedEvents>,
    ) {
        const { op, userId } = payload
        switch (op) {
            case MembershipOp.SO_INVITE:
                if (type === 'confirmed') {
                    this.pendingInvitedUsers.delete(userId)
                    if (this.invitedUsers.add(userId)) {
                        emitter?.emit('streamNewUserInvited', this.streamId, userId)
                        this.emitMembershipChange(userId, emitter, this.streamId)
                    }
                } else {
                    if (this.pendingInvitedUsers.add(userId)) {
                        emitter?.emit('streamPendingMembershipUpdated', this.streamId, userId)
                    }
                }
                break
            case MembershipOp.SO_JOIN:
                if (type === 'confirmed') {
                    this.pendingJoinedUsers.delete(userId)
                    if (this.joinedUsers.add(userId)) {
                        emitter?.emit('streamNewUserJoined', this.streamId, userId)
                        this.emitMembershipChange(userId, emitter, this.streamId)
                    }
                } else {
                    if (this.pendingJoinedUsers.add(userId)) {
                        emitter?.emit('streamPendingMembershipUpdated', this.streamId, userId)
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
                        emitter?.emit('streamUserLeft', this.streamId, userId)
                        this.emitMembershipChange(userId, emitter, this.streamId)
                    }
                } else {
                    if (this.pendingLeftUsers.add(userId)) {
                        emitter?.emit('streamPendingMembershipUpdated', this.streamId, userId)
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
        emitter: TypedEmitter<StreamEvents> | undefined,
        streamId: string,
    ) {
        emitter?.emit('streamMembershipUpdated', streamId, userId)
        if (userId === this.userId) {
            emitter?.emit('streamMyMembershipUpdated', streamId, {
                invited: this.invitedUsers.has(userId),
                joined: this.joinedUsers.has(userId),
            })
        }
    }
}

export class StreamStateView_UserStreamMembership extends StreamStateView_Membership {
    constructor(streamId: string) {
        const userId = streamId.split('-')[1]
        super(userId, streamId)
        this.joinedUsers.add(userId)
    }
}
