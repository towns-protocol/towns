import { MembershipOp } from '@river-build/proto'
import EventEmitter from 'events'
import TypedEmitter from 'typed-emitter'
import { PersistedObservable, persistedObservable } from '../../../observable/persistedObservable'
import { LoadPriority, Store } from '../../../store/store'
import { dlogger } from '@river-build/dlog'

const logger = dlogger('csb:userMemberships')

export interface UserMembership {
    streamId: string
    op: MembershipOp
    inviter?: string
    streamParentId?: string
}

export interface UserMembershipsModel {
    id: string
    initialized: boolean
    memberships: Record<string, UserMembership>
}

export type UserMembershipEvents = {
    userJoinedStream: (streamId: string) => void
    userInvitedToStream: (streamId: string) => void
    userLeftStream: (streamId: string) => void
    userStreamMembershipChanged: (streamId: string) => void
}

@persistedObservable({ tableName: 'userMemberships', loadPriority: LoadPriority.high })
export class UserMemberships extends PersistedObservable<UserMembershipsModel> {
    emitter: TypedEmitter<UserMembershipEvents>

    constructor(id: string, store: Store) {
        super({ id, initialized: false, memberships: {} }, store)
        this.emitter = new EventEmitter() as TypedEmitter<UserMembershipEvents>
    }

    override async onLoaded() {
        if (this.data.initialized) {
            // start doing stuff
        }
    }

    async initialize(metadata?: { spaceId: Uint8Array }) {
        logger.log('initialize', metadata)
        this.update({ ...this.data, initialized: true })
        // get or create the user stream
    }

    getMembership(streamId: string): UserMembership | undefined {
        return this.data.memberships[streamId]
    }

    isMember(streamId: string, membership: MembershipOp): boolean {
        return this.getMembership(streamId)?.op === membership
    }

    isJoined(streamId: string): boolean {
        return this.isMember(streamId, MembershipOp.SO_JOIN)
    }
}
