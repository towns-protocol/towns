import { streamIdAsBytes } from '../../id'
import { PersistedObservable, persistedObservable } from '../../observable/persistedObservable'
import { LoadPriority, Store } from '../../store/store'
import { StreamsClient } from '../streams/streamsClient'
import { UserDeviceKeys } from './models/userDeviceKeys'
import { UserInbox } from './models/userInbox'
import { UserMemberships } from './models/userMemberships'
import { UserSettings } from './models/userSettings'

export interface UserModel {
    id: string
    initialized: boolean
}

@persistedObservable({ tableName: 'user', loadPriority: LoadPriority.high })
export class User extends PersistedObservable<UserModel> {
    id: string
    streamsClient: StreamsClient
    memberships: UserMemberships
    inbox: UserInbox
    deviceKeys: UserDeviceKeys
    settings: UserSettings

    constructor(id: string, store: Store, streamsClient: StreamsClient) {
        super({ id, initialized: false }, store)
        this.id = id
        this.streamsClient = streamsClient
        this.memberships = new UserMemberships(id, store)
        this.inbox = new UserInbox(id, store)
        this.deviceKeys = new UserDeviceKeys(id, store)
        this.settings = new UserSettings(id, store)
    }

    override async onLoaded() {
        // if the user exists, we can go ahead and start the user streams
        if (this.data.initialized) {
            // start doing stuff
        } else {
            // first time loading the user, check if the user exists
            const canInitialize = await this.streamsClient.userExists(this.id)
            if (canInitialize) {
                await this.initialize()
            }
        }
    }

    async initialize(newUserMetadata?: { spaceId: Uint8Array | string }) {
        const metadata = formatMetadata(newUserMetadata)
        await Promise.all([
            this.memberships.initialize(metadata),
            this.inbox.initialize(metadata),
            this.deviceKeys.initialize(metadata),
            this.settings.initialize(metadata),
        ])
        this.update({ ...this.data, initialized: true })
    }
}

function formatMetadata(metadata?: { spaceId: Uint8Array | string }) {
    return metadata
        ? {
              ...metadata,
              spaceId: streamIdAsBytes(metadata.spaceId),
          }
        : undefined
}
