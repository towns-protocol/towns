import { LookupUser } from '../types/user-lookup'
import { UserLookupContext } from '../components/UserLookupContext'
import { useUserLookupStore } from '../store/use-user-lookup-store'
import React, { useCallback } from 'react'
import memoize from 'lodash/memoize'

export type LookupUserFn = {
    (userId: string, allowDefault?: false): LookupUser | undefined
    (userId: string, allowDefault?: true): LookupUser
}

export const useUserLookupContext = () => {
    const context = React.useContext(UserLookupContext)
    const spaceId = context?.spaceId
    const channelId = context?.channelId

    const { lookupUser: genericLookupUser } = useUserLookupStore()

    const lookupUser = useCallback(
        (userId: string, allowDefault?: boolean) =>
            genericLookupUser(userId, spaceId, channelId) ??
            // if user is not found and `allowUknown` set return a stable unknown user
            (allowDefault ? getStableDefault(userId) : undefined),
        [genericLookupUser, spaceId, channelId],
    ) as LookupUserFn

    return {
        lookupUser,
    }
}

const getStableDefault = memoize(
    (userId: string): LookupUser => {
        return {
            userId,
            username: userId,
            usernameConfirmed: true,
            usernameEncrypted: false,
            displayName: 'Unknown User',
            displayNameEncrypted: false,
        }
    },
    (userId) => userId,
)
