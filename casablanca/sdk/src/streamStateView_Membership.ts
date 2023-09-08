import { Membership, MembershipOp } from '@river/proto'
import { logNever } from './check'
import TypedEmitter from 'typed-emitter'
import { StreamEvents } from './streamEvents'
import { EmittedEvents } from './client'

export class StreamStateView_Membership {
    readonly userId: string
    readonly joinedUsers = new Set<string>()
    readonly invitedUsers = new Set<string>()

    constructor(userId: string) {
        this.userId = userId
    }

    initialize(
        memberships: { [key: string]: Membership },
        streamId: string,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ) {
        // iterate over map, add joined and invited users
        for (const membership of Object.values(memberships)) {
            this.appendMembershipEvent(membership, streamId, emitter)
        }
    }

    appendMembershipEvent(
        payload: Membership,
        streamId: string,
        emitter?: TypedEmitter<StreamEvents>,
    ): void {
        const { op, userId } = payload
        switch (op) {
            case MembershipOp.SO_INVITE:
                if (this.invitedUsers.add(userId)) {
                    emitter?.emit('streamNewUserInvited', streamId, userId)
                    this.maybeEmitMyMembershipChange(userId, emitter, streamId)
                }
                break
            case MembershipOp.SO_JOIN:
                if (this.joinedUsers.add(userId)) {
                    emitter?.emit('streamNewUserJoined', streamId, userId)
                    this.maybeEmitMyMembershipChange(userId, emitter, streamId)
                }
                break
            case MembershipOp.SO_LEAVE:
                {
                    const wasJoined = this.joinedUsers.delete(userId)
                    const wasInvited = this.invitedUsers.delete(userId)
                    if (wasJoined || wasInvited) {
                        emitter?.emit('streamUserLeft', streamId, userId)
                        this.maybeEmitMyMembershipChange(userId, emitter, streamId)
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
