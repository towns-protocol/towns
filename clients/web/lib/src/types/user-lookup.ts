import { Nft, RoomMember } from './towns-types'

export type UserLookupContextType = {
    spaceId?: string
    channelId?: string
}

export type LookupUser = {
    userId: string
    username: string
    usernameConfirmed: boolean
    usernameEncrypted: boolean
    displayName: string
    displayNameEncrypted: boolean
    ensAddress?: string
    memberOf?: MemberOf
    nft?: Nft
}

export type MemberOf = {
    [spaceId: string]: {
        spaceId?: string
        userId: string
        username: string
        displayName: string
        avatarUrl?: string
        ensAddress?: string
        nft?: Nft
    }
}

export type KnownUser = RoomMember & {
    memberOf: MemberOf
    ensAddress?: string
}
