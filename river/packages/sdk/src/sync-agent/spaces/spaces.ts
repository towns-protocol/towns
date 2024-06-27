import { Identifiable, Store } from '../../store/store'
import {
    PersistedModel,
    PersistedObservable,
    persistedObservable,
} from '../../observable/persistedObservable'
import { Space } from './models/space'
import { User } from '../user/user'
import { UserMembershipsModel } from '../user/models/userMemberships'
import { MembershipOp } from '@river-build/proto'
import { isSpaceStreamId } from '../../id'
import { RiverConnection } from '../river-connection/riverConnection'

export interface SpacesModel extends Identifiable {
    id: '0' // single data blobs need a fixed key
    spaceIds: string[] // joined spaces
}

@persistedObservable({ tableName: 'spaces' })
export class Spaces extends PersistedObservable<SpacesModel> {
    private spaces: Record<string, Space> = {}
    private user: User
    private riverConnection: RiverConnection

    constructor(riverConnection: RiverConnection, user: User, store: Store) {
        super({ id: '0', spaceIds: [] }, store)
        this.riverConnection = riverConnection
        this.user = user
    }

    protected override async onLoaded() {
        this.user.streams.memberships.subscribe(
            (userMemberships) => {
                this.onUserDataChanged(userMemberships)
            },
            { fireImediately: true },
        )
    }

    getSpace(spaceId: string): Space | undefined {
        return this.spaces[spaceId]
    }

    private onUserDataChanged(userData: PersistedModel<UserMembershipsModel>) {
        if (userData.status === 'loading') {
            return
        }
        const spaceIds = Object.values(userData.data.memberships)
            .filter((m) => isSpaceStreamId(m.streamId) && m.op === MembershipOp.SO_JOIN)
            .map((m) => m.streamId)

        this.setData({ spaceIds })

        for (const spaceId of spaceIds) {
            if (!this.spaces[spaceId]) {
                this.spaces[spaceId] = new Space(spaceId, this.riverConnection, this.store)
            }
        }
    }
}
