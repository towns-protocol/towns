import { Members } from './members/members'
import { RiverChain } from './river-connection/models/riverChain'
import { RiverConnection } from './river-connection/riverConnection'
import { Channel } from './spaces/models/channel'
import { Space } from './spaces/models/space'
import { Spaces } from './spaces/spaces'
import { UserMetadata } from './user/models/userMetadata'
import { UserInbox } from './user/models/userInbox'
import { UserMemberships } from './user/models/userMemberships'
import { UserSettings } from './user/models/userSettings'
import { User } from './user/user'
import { Gdms } from './gdms/gdms'
import { Gdm } from './gdms/models/gdm'
import { Member } from './members/models/member'
import { Dms } from './dms/dms'
import { Dm } from './dms/models/dm'
import { UserReadMarker } from './user/models/readMarker'

export const DB_VERSION = 1
export const DB_MODELS = [
    Channel,
    Space,
    Spaces,
    RiverChain,
    RiverConnection,
    User,
    UserMetadata,
    UserInbox,
    UserMemberships,
    UserSettings,
    UserReadMarker,
    Members,
    Member,
    Gdms,
    Gdm,
    Dms,
    Dm,
]
