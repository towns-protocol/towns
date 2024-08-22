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

@persistedObservable({ tableName: 'member_membership' })
export class MemberMembership extends PersistedObservable<MemberMembershipModel> {
    constructor(
        userId: string,
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

    protected override async onLoaded() {
        this.riverConnection.registerView((client) => {
            if (
                client.streams.has(this.data.id) &&
                client.streams.get(this.data.id)?.view.isInitialized
            ) {
                this.onStreamInitialized(this.data.id)
            }
            client.on('streamInitialized', this.onStreamInitialized)
            client.on(
                'streamNewUserInvited',
                this.onStreamMembershipUpdated(MembershipOp.SO_INVITE),
            )
            client.on('streamNewUserJoined', this.onStreamMembershipUpdated(MembershipOp.SO_JOIN))
            client.on('streamUserLeft', this.onStreamMembershipUpdated(MembershipOp.SO_LEAVE))
            return () => {
                client.off('streamInitialized', this.onStreamInitialized)
                client.off(
                    'streamNewUserInvited',
                    this.onStreamMembershipUpdated(MembershipOp.SO_INVITE),
                )
                client.off(
                    'streamNewUserJoined',
                    this.onStreamMembershipUpdated(MembershipOp.SO_JOIN),
                )
                client.off('streamUserLeft', this.onStreamMembershipUpdated(MembershipOp.SO_LEAVE))
            }
        })
    }

    private onStreamInitialized = (streamId: string) => {
        if (streamId === this.data.streamId) {
            const streamView = this.riverConnection.client?.stream(this.data.streamId)?.view
            check(isDefined(streamView), 'streamView is not defined')
            const op = streamView.getMembers().membership.info(this.data.id)
            this.setData({ initialized: true, op })
        }
    }

    private onStreamMembershipUpdated =
        (op: MembershipOp.SO_JOIN | MembershipOp.SO_INVITE | MembershipOp.SO_LEAVE) =>
        (streamId: string, userId: string) => {
            if (streamId === this.data.streamId && userId === this.data.id) {
                this.setData({ op })
            }
        }
}
