import React, { createContext, useMemo } from 'react'
import { MemberOf, useAllKnownUsers } from '../hooks/use-all-known-users'
import { useRoom, useRoomWithStreamId } from '../hooks/use-room'
import { useSpaceContext } from './SpaceContextProvider'

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

export type UserLookupContextType = {
    streamId?: string
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
            return {
                streamId: spaceId.streamId,
                users,
                usersMap,
            }
        } else {
            return parentContext
        }
    }, [members, parentContext, spaceId])

    return <UserLookupContext.Provider value={value}>{props.children}</UserLookupContext.Provider>
}

export const DMChannelContextUserLookupProvider = (props: {
    channelId: string | undefined
    children: React.ReactNode
    fallbackToParentContext?: boolean
}) => {
    const { channelId } = props

    const room = useRoomWithStreamId(channelId)
    const parentContext = useUserLookupContext()
    const spaceId = parentContext?.streamId

    const value = useMemo(() => {
        if (!room) {
            return {
                users: [],
                usersMap: {},
            }
        }
        const users = room.members.map((member) => ({
            ...member,
            memberOf: parentContext?.usersMap[member.userId]?.memberOf,
        }))

        // opportunistically fill in displayName from parent context if
        // allowed. This is designed for the DM channels within spaces
        if (props.fallbackToParentContext) {
            users.forEach((user) => {
                if (!user.username && !user.displayName && user.memberOf) {
                    // find the first (not necesarilly the best, since that
                    // would be subjective) alternative that has a displayName
                    const matches = Object.values(user.memberOf)
                        .filter((u) => u.displayName.length > 0 || u.username.length > 0)
                        .sort((a, b) =>
                            !spaceId
                                ? 0
                                : Math.sign(
                                      spaceCompare(a.spaceId, spaceId) -
                                          spaceCompare(b.spaceId, spaceId),
                                  ),
                        )

                    if (matches.length > 0) {
                        user.username = matches[0].username
                        user.displayName = matches[0].displayName
                    }
                }
            })
        }
        const usersMap = users.reduce((acc, user) => {
            acc[user.userId] = user
            return acc
        }, {} as { [key: string]: LookupUser })
        return {
            streamId: channelId,
            users,
            usersMap,
        }
    }, [room, props.fallbackToParentContext, channelId, parentContext?.usersMap, spaceId])

    return <UserLookupContext.Provider value={value}>{props.children}</UserLookupContext.Provider>
}

const spaceCompare = (memberStreamId: string, currentStreamId: string) =>
    memberStreamId === currentStreamId ? -1 : 1
