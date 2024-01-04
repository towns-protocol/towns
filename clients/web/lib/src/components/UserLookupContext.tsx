import React from 'react'
import { LookupUser, LookupUserMap } from 'types/user-lookup'

export type UserLookupContextType = {
    streamId?: string
    users: LookupUser[]
    usersMap: LookupUserMap
}

export const UserLookupContext = React.createContext<UserLookupContextType | null>(null)
