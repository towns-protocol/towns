import { Nft } from './towns-types'

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
    ensName?: string
    nft?: Nft
}
