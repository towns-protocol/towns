import { RoomMember } from './towns-types'

export type LookupUserMap = { [key: string]: LookupUser }

export type UserLookupContextType = {
    spaceId?: string
    streamId?: string
    users: LookupUser[]
    usersMap: LookupUserMap
}

export type LookupUser = {
    userId: string
    username: string
    usernameConfirmed: boolean
    usernameEncrypted: boolean
    displayName: string
    displayNameEncrypted: boolean
    avatarUrl?: string
    memberOf?: MemberOf
}

export type MemberOf = {
    [spaceId: string]: {
        spaceId: string
        userId: string
        username: string
        displayName: string
        avatarUrl?: string
    }
}

export type KnownUser = RoomMember & {
    memberOf: MemberOf
}
