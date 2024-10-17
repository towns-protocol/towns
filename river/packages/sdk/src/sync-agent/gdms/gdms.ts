import { Identifiable, LoadPriority, Store } from '../../store/store'
import {
    PersistedModel,
    PersistedObservable,
    persistedObservable,
} from '../../observable/persistedObservable'
import { UserMemberships, UserMembershipsModel } from '../user/models/userMemberships'
import { MembershipOp } from '@river-build/proto'
import { isGDMChannelStreamId } from '../../id'
import { RiverConnection } from '../river-connection/riverConnection'
import { check } from '@river-build/dlog'
import type { Client } from '../../client'
import { Gdm } from './models/gdm'

export interface GdmsModel extends Identifiable {
    id: '0' // single data blobs need a fixed key
    streamIds: string[] // joined gdms
}

@persistedObservable({ tableName: 'gdms' })
export class Gdms extends PersistedObservable<GdmsModel> {
    private gdms: Record<string, Gdm> = {}

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

    getGdm(streamId: string): Gdm {
        check(isGDMChannelStreamId(streamId), 'Invalid streamId')
        if (!this.gdms[streamId]) {
            this.gdms[streamId] = new Gdm(streamId, this.riverConnection, this.store)
        }
        return this.gdms[streamId]
    }

    private onUserMembershipsChanged(value: PersistedModel<UserMembershipsModel>) {
        if (value.status === 'loading') {
            return
        }

        const streamIds = Object.values(value.data.memberships)
            .filter((m) => isGDMChannelStreamId(m.streamId) && m.op === MembershipOp.SO_JOIN)
            .map((m) => m.streamId)

        this.setData({ streamIds })

        for (const streamId of streamIds) {
            if (!this.gdms[streamId]) {
                this.gdms[streamId] = new Gdm(streamId, this.riverConnection, this.store)
            }
        }
    }

    async createGDM(...args: Parameters<Client['createGDMChannel']>) {
        return this.riverConnection.call((client) => client.createGDMChannel(...args))
    }
}
