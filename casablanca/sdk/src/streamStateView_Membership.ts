import { Membership, MembershipOp } from '@river/proto'
import { logNever } from './check'
import TypedEmitter from 'typed-emitter'
import { StreamEvents } from './streamEvents'
import { EmittedEvents } from './client'

export class StreamStateView_Membership {
    readonly userId: string
    readonly streamId: string
    readonly joinedUsers = new Set<string>()
    readonly invitedUsers = new Set<string>()

    constructor(userId: string, streamId: string) {
        this.userId = userId
        this.streamId = streamId
    }

    initialize(
        memberships: { [key: string]: Membership },
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ) {
        // iterate over map, add joined and invited users
        for (const membership of Object.values(memberships)) {
            this.applyMembershipEvent(membership, emitter)
        }
    }

    appendMembershipEvent(
        _eventHashStr: string,
        payload: Membership,
        emitter?: TypedEmitter<StreamEvents>,
    ): void {
        this.applyMembershipEvent(payload, emitter)
    }

    /**
     * If no userId is provided, checks current user
     */
    isMemberJoined(userId?: string): boolean {
        return this.joinedUsers.has(userId ?? this.userId)
    }

    private applyMembershipEvent(payload: Membership, emitter?: TypedEmitter<StreamEvents>): void {
        const { op, userId } = payload
        switch (op) {
            case MembershipOp.SO_INVITE:
                if (this.invitedUsers.add(userId)) {
                    emitter?.emit('streamNewUserInvited', this.streamId, userId)
                    this.maybeEmitMyMembershipChange(userId, emitter, this.streamId)
                }
                break
            case MembershipOp.SO_JOIN:
                if (this.joinedUsers.add(userId)) {
                    emitter?.emit('streamNewUserJoined', this.streamId, userId)
                    this.maybeEmitMyMembershipChange(userId, emitter, this.streamId)
                }
                break
            case MembershipOp.SO_LEAVE:
                {
                    const wasJoined = this.joinedUsers.delete(userId)
                    const wasInvited = this.invitedUsers.delete(userId)
                    if (wasJoined || wasInvited) {
                        emitter?.emit('streamUserLeft', this.streamId, userId)
                        this.maybeEmitMyMembershipChange(userId, emitter, this.streamId)
                    }
                }
                break
            case MembershipOp.SO_UNSPECIFIED:
                break
            default:
                logNever(op)
        }
    }

    private maybeEmitMyMembershipChange(
        userId: string,
        emitter: TypedEmitter<StreamEvents> | undefined,
        streamId: string,
    ) {
        if (userId === this.userId) {
            emitter?.emit('streamMyMembershipUpdated', streamId, {
                invited: this.invitedUsers.has(userId),
                joined: this.joinedUsers.has(userId),
            })
        }
    }
}
