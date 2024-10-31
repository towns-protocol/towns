import { Identifiable, LoadPriority, Store } from '../../store/store'
import {
    PersistedModel,
    PersistedObservable,
    persistedObservable,
} from '../../observable/persistedObservable'
import { UserMemberships, UserMembershipsModel } from '../user/models/userMemberships'
import { MembershipOp } from '@river-build/proto'
import { isDMChannelStreamId, makeDMStreamId } from '../../id'
import { RiverConnection } from '../river-connection/riverConnection'
import { check } from '@river-build/dlog'
import type { Client } from '../../client'
import { Dm } from './models/dm'

export interface DmsModel extends Identifiable {
    id: '0' // single data blobs need a fixed key
    streamIds: string[] // joined dms
}

@persistedObservable({ tableName: 'dms' })
export class Dms extends PersistedObservable<DmsModel> {
    private dms: Record<string, Dm> = {}

    constructor(
        store: Store,
        private riverConnection: RiverConnection,
        private userMemberships: UserMemberships,
    ) {
        super({ id: '0', streamIds: [] }, store, LoadPriority.high)
    }

    protected override onLoaded() {
        this.userMemberships.subscribe(
            (value) => {
                this.onUserMembershipsChanged(value)
            },
            { fireImediately: true },
        )
    }

    getDm(streamId: string): Dm {
        check(isDMChannelStreamId(streamId), 'Invalid streamId')
        if (!this.dms[streamId]) {
            this.dms[streamId] = new Dm(streamId, this.riverConnection, this.store)
        }
        return this.dms[streamId]
    }

    getDmWithUserId(userId: string): Dm {
        const streamId = makeDMStreamId(this.riverConnection.userId, userId)
        return this.getDm(streamId)
    }

    private onUserMembershipsChanged(value: PersistedModel<UserMembershipsModel>) {
        if (value.status === 'loading') {
            return
        }
        const streamIds = Object.values(value.data.memberships)
            .filter((m) => isDMChannelStreamId(m.streamId) && m.op === MembershipOp.SO_JOIN)
            .map((m) => m.streamId)

        this.setData({ streamIds })
        for (const streamId of streamIds) {
            if (!this.dms[streamId]) {
                this.dms[streamId] = new Dm(streamId, this.riverConnection, this.store)
            }
        }
    }

    async createDM(...args: Parameters<Client['createDMChannel']>) {
        return this.riverConnection.call((client) => client.createDMChannel(...args))
    }
}
