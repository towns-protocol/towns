import { MembershipOp } from '@river-build/proto'
import { LoadPriority, type Identifiable, type Store } from '../../../store/store'
import { check } from '@river-build/dlog'
import { isDefined } from '../../../check'
import { persistedObservable, PersistedObservable } from '../../../observable/persistedObservable'
import type { RiverConnection } from '../../river-connection/riverConnection'

// TODO: inviter, streamParentId
export interface MemberMembershipModel extends Identifiable {
    id: string
    streamId: string
    initialized: boolean
    op: MembershipOp
}

// This model doenst listen to events here.
// They are listened in the members model, which propagates the updates to this model.
@persistedObservable({ tableName: 'member_membership' })
export class MemberMembership extends PersistedObservable<MemberMembershipModel> {
    constructor(
        private userId: string,
        streamId: string,
        private riverConnection: RiverConnection,
        store: Store,
    ) {
        super(
            {
                id: `${userId}_${streamId}`,
                streamId,
                initialized: false,
                op: MembershipOp.SO_UNSPECIFIED,
            },
            store,
            LoadPriority.high,
        )
    }

    public onStreamInitialized = (streamId: string) => {
        if (streamId === this.data.streamId) {
            const streamView = this.riverConnection.client?.stream(this.data.streamId)?.view
            check(isDefined(streamView), 'streamView is not defined')
            const op = streamView.getMembers().membership.info(this.userId)
            this.setData({ initialized: true, op })
        }
    }

    public onStreamMembershipUpdated = (streamId: string, userId: string, op: MembershipOp) => {
        if (streamId === this.data.streamId && userId === this.userId) {
            this.setData({ op })
        }
    }
}
