import { PersistedObservable, persistedObservable } from '../../observable/persistedObservable'
import { LoadPriority, Store } from '../../store/store'
import { RiverConnection } from '../river-connection/riverConnection'
import { UserMetadata } from './models/userMetadata'
import { UserInbox } from './models/userInbox'
import { UserMemberships } from './models/userMemberships'
import { UserSettings } from './models/userSettings'

export interface UserModel {
    id: string
}

@persistedObservable({ tableName: 'user' })
export class User extends PersistedObservable<UserModel> {
    memberships: UserMemberships
    inbox: UserInbox
    deviceKeys: UserMetadata
    settings: UserSettings

    constructor(id: string, store: Store, riverConnection: RiverConnection) {
        super({ id }, store, LoadPriority.high)
        this.memberships = new UserMemberships(id, store, riverConnection)
        this.inbox = new UserInbox(id, store, riverConnection)
        this.deviceKeys = new UserMetadata(id, store, riverConnection)
        this.settings = new UserSettings(id, store, riverConnection)
    }
}
