import { Membership, MembershipOp } from '@river/proto'
import { checkNever } from './check'
import TypedEmitter from 'typed-emitter'
import { StreamEvents } from './streamEvents'

export class StreamStateView_Membership {
    readonly joinedUsers = new Set<string>()
    readonly invitedUsers = new Set<string>()

    addMembershipEvent(
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
                this.joinedUsers.delete(userId)
                this.invitedUsers.delete(userId)
                emitter?.emit('streamUserLeft', streamId, userId)
                break
            case MembershipOp.SO_UNSPECIFIED:
                break
            default:
                checkNever(op)
        }
    }
}
