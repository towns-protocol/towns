import { LookupUser, LookupUserMap } from '../types/user-lookup'
import { UserLookupContext } from '../components/UserLookupContext'
import React from 'react'

export type UserLookupContextType = {
    streamId?: string
    spaceId?: string
    users: LookupUser[]
    usersMap: LookupUserMap
}

export const useUserLookupContext = () => {
    const context = React.useContext(UserLookupContext)
    if (!context) {
        throw new Error('useUserLookupContext must be used in a UserLookupContextProvider')
    }
    return context
}
