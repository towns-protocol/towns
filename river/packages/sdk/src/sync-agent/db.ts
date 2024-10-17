import { Members } from './members/members'
import { MemberMembership } from './members/models/membership'
import { MemberDisplayName } from './members/models/metadata/displayName'
import { MemberEnsAddress } from './members/models/metadata/ensAddress'
import { MemberNft } from './members/models/metadata/nft'
import { MemberUsername } from './members/models/metadata/username'
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
    Members,
    MemberUsername,
    MemberDisplayName,
    MemberEnsAddress,
    MemberNft,
    MemberMembership,
    Gdms,
    Gdm,
]
