import { Store } from '../store/store'
import { StreamNodeUrls } from './river-connection/models/streamNodeUrls'
import { UserDeviceKeys } from './user/models/userDeviceKeys'
import { UserInbox } from './user/models/userInbox'
import { UserMemberships } from './user/models/userMemberships'
import { UserSettings } from './user/models/userSettings'
import { User } from './user/user'

const VERSION = 1
const DB_NAME = (userId: string) => `syncAgent-${userId}`
const MODELS = [StreamNodeUrls, User, UserDeviceKeys, UserInbox, UserMemberships, UserSettings]

export class SyncAgentStore extends Store {
    constructor(userId: string) {
        super(DB_NAME(userId), VERSION, MODELS)
    }
}
