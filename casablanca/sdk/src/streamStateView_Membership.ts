import { Membership, MembershipOp } from '@river/proto'
import { logNever } from './check'
import TypedEmitter from 'typed-emitter'
import { StreamEvents } from './streamEvents'
import { EmittedEvents } from './client'

export class StreamStateView_Membership {
    readonly joinedUsers = new Set<string>()
    readonly invitedUsers = new Set<string>()

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
                this.invitedUsers.add(userId)
                emitter?.emit('streamNewUserInvited', streamId, userId)
                break
            case MembershipOp.SO_JOIN:
                this.joinedUsers.add(userId)
                emitter?.emit('streamNewUserJoined', streamId, userId)
                break
            case MembershipOp.SO_LEAVE:
                {
                    const wasJoined = this.joinedUsers.delete(userId)
                    const wasInvited = this.invitedUsers.delete(userId)
                    if (wasJoined || wasInvited) {
                        emitter?.emit('streamUserLeft', streamId, userId)
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
