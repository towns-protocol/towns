import { LookupUser } from '../types/user-lookup'
import { UserLookupContext } from '../components/UserLookupContext'
import { useUserLookupStore } from '../store/use-user-lookup-store'
import React, { useCallback } from 'react'
import memoize from 'lodash/memoize'

export type LookupUserFn = (userId: string) => LookupUser

export const useUserLookupContext = () => {
    const context = React.useContext(UserLookupContext)
    const spaceId = context?.spaceId
    const channelId = context?.channelId

    const { lookupUser: genericLookupUser } = useUserLookupStore()

    const lookupUser: LookupUserFn = useCallback(
        (userId: string) =>
            genericLookupUser(userId, spaceId, channelId) ??
            // if user is not found and `allowUknown` set return a stable unknown user
            getStableDefault(userId),
        [genericLookupUser, spaceId, channelId],
    )

    return {
        lookupUser,
    }
}

const getStableDefault = memoize(
    (userId: string): LookupUser => ({
        // note: pretty user and display names will be generated from userId
        // via getPrettyDisplayName
        userId,
        username: '',
        usernameConfirmed: false,
        usernameEncrypted: false,
        displayName: '',
        displayNameEncrypted: false,
    }),
    (userId) => userId,
)
