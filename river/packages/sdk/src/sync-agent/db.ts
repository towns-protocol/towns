import { StreamNodeUrls } from './river-connection/models/streamNodeUrls'
import { UserDeviceKeys } from './user/models/userDeviceKeys'
import { UserInbox } from './user/models/userInbox'
import { UserMemberships } from './user/models/userMemberships'
import { UserSettings } from './user/models/userSettings'
import { User } from './user/user'

export const DB_VERSION = 1
export const DB_MODELS = [
    StreamNodeUrls,
    User,
    UserDeviceKeys,
    UserInbox,
    UserMemberships,
    UserSettings,
]
