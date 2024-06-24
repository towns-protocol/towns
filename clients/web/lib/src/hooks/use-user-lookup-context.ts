import { LookupUser } from '../types/user-lookup'
import { UserLookupContext } from '../components/UserLookupContext'
import { useUserLookupStore, userLookupFn } from '../store/use-user-lookup-store'
import React, { useCallback } from 'react'
import memoize from 'lodash/memoize'

export type LookupUserFn = (userId: string) => LookupUser

/**
 * returns a function to imperatively lookup a user by userId within the scope of
 * the current space or channel
 */
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

/**
 * retrieve a user within scope of the current channel or space
 */
export const useUserLookup = (userId: string) => {
    const { spaceId, channelId } = React.useContext(UserLookupContext) ?? {}
    return useUserLookupStore(
        (s) => userLookupFn(s, userId, spaceId, channelId) ?? getStableDefault(userId),
    )
}

/**
 * based on a list of userIds, creates an array of users from the current channel
 * or space
 *
 * tldr; when possible use useUserLookup() to focus on the updated user slice
 *
 * This is useful when you need to lookup multiple users as a whole (e.g a
 * coma separated list of names that needs to re-rendered fully when any of the
 * usernames changes)
 *
 * However if the elements of the list can be rendered
 * as independent components it would be recommended to lookup each user slice individually to
 * avoid full re-renders. @see useUserLookup()
 */
export const useUserLookupArray = (userIds: string[]) => {
    const { spaceId, channelId } = React.useContext(UserLookupContext) ?? {}
    return useUserLookupStore((s) => {
        return userIds.reduce<LookupUser[]>((acc, userId) => {
            acc.push(userLookupFn(s, userId, spaceId, channelId) ?? getStableDefault(userId))
            return acc
        }, [])
    })
}

/**
 * based on a list of userIds, creates a map of users from the current channel
 * or space
 *
 * tldr; when possible use useUserLookup() to focus on the updated user slice
 *
 * Similar to useUserLookupArray but more interesting if the list of userIds is
 * prone to change frequently. With the map the lookup doesn't need to trigger
 * an update because of the order or the ids changes
 */
export const useUserLookupMap = (userIds: string[]) => {
    const { spaceId, channelId } = React.useContext(UserLookupContext) ?? {}
    return useUserLookupStore((s) => {
        return userIds.reduce<Map<string, LookupUser>>(
            (acc, userId) =>
                acc.set(
                    userId,
                    userLookupFn(s, userId, spaceId, channelId) ?? getStableDefault(userId),
                ),
            new Map(),
        )
    })
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
