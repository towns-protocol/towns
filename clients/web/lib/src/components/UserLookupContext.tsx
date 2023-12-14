import React, { createContext, useMemo } from 'react'
import { MemberOf, useAllKnownUsers } from '../hooks/use-all-known-users'
import { useRoom } from '../hooks/use-room'
import { useSpaceContext } from './SpaceContextProvider'

export type LookupUser = {
    userId: string
    name: string
    displayName: string
    avatarUrl?: string
    memberOf?: MemberOf
}

export type UserLookupContextType = {
    users: LookupUser[]
    usersMap: { [key: string]: LookupUser }
}

export const UserLookupContext = createContext<UserLookupContextType | null>(null)

export const useUserLookupContext = () => {
    const context = React.useContext(UserLookupContext)
    if (!context) {
        throw new Error('useUserLookupContext must be used in a UserLookupContextProvider')
    }
    return context
}

/**
 * utility provider added to topmost zion context
 */
export const GlobalContextUserLookupProvider = (props: { children: React.ReactNode }) => {
    const allUsers = useAllKnownUsers()
    return (
        <UserLookupContext.Provider value={allUsers}>{props.children}</UserLookupContext.Provider>
    )
}

/**
 * utility provider added to each space context
 */
export const SpaceContextUserLookupProvider = (props: { children: React.ReactNode }) => {
    const { spaceId } = useSpaceContext()
    const parentContext = useUserLookupContext()

    const members = useRoom(spaceId)

    const value = useMemo(() => {
        // avoid overriding parent context if spaceId isn't set (e.g DM channels)
        if (members && spaceId) {
            const users = members.members.map((member) => ({
                ...member,
                memberOf: parentContext?.usersMap[member.userId]?.memberOf,
            }))
            const usersMap = users.reduce((acc, user) => {
                acc[user.userId] = user
                return acc
            }, {} as { [key: string]: LookupUser })
            return { users, usersMap }
        } else {
            return parentContext
        }
    }, [members, parentContext, spaceId])

    return <UserLookupContext.Provider value={value}>{props.children}</UserLookupContext.Provider>
}
