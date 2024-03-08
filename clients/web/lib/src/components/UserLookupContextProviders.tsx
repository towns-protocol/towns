import React, { useMemo, useRef } from 'react'
import { useAllKnownUsers } from '../hooks/use-all-known-users'
import { useRoom, useRoomWithStreamId } from '../hooks/use-room'
import { useSpaceContext } from './SpaceContextProvider'
import isEqual from 'lodash/isEqual'
import { UserLookupContext } from './UserLookupContext'
import { useUserLookupContext } from '../hooks/use-user-lookup-context'
import { LookupUser, LookupUserMap, UserLookupContextType } from '../types/user-lookup'

/**
 * utility provider added to topmost towns context
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
    const {
        usersMap: parentContextUsersMap,
        users: parentContextUsers,
        spaceId: rootSpaceId,
    } = useUserLookupContext()

    const spaceId = useSpaceContext()?.spaceId ?? rootSpaceId

    const members = useRoom(spaceId)
    const usersCache = useRef<LookupUserMap>({})

    const value = useMemo(() => {
        // avoid overriding parent context if spaceId isn't set (e.g DM channels)
        if (members && spaceId) {
            const users = members.members.map((member) => {
                const user = {
                    ...member,
                    memberOf: parentContextUsersMap?.[member.userId]?.memberOf,
                }
                const prev = usersCache.current[user.userId]
                if (prev && isEqual(prev, user)) {
                    return prev
                } else {
                    usersCache.current[user.userId] = user
                    return user
                }
            })
            const usersMap = users.reduce((acc, user) => {
                acc[user.userId] = user
                return acc
            }, {} as { [key: string]: LookupUser })
            return {
                streamId: spaceId,
                spaceId: spaceId,
                users,
                usersMap,
            } satisfies UserLookupContextType
        } else {
            return {
                streamId: spaceId,
                spaceId: spaceId,
                users: parentContextUsers,
                usersMap: parentContextUsersMap,
            } satisfies UserLookupContextType
        }
    }, [members, parentContextUsers, parentContextUsersMap, spaceId])

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
    const spaceId = parentContext?.spaceId

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

        const allUsers = Object.values(room.membersMap).map((member) => ({
            ...member,
            memberOf: parentContext?.usersMap[member.userId]?.memberOf,
        }))

        // opportunistically fill in displayName from parent context if
        // allowed. This is designed for the DM channels within spaces
        if (props.fallbackToParentContext) {
            allUsers.forEach((u) => mergeNames(u, spaceId))
            users.forEach((u) => mergeNames(u, spaceId))
        }
        const usersMap = allUsers.reduce((acc, user) => {
            acc[user.userId] = user
            return acc
        }, {} as { [key: string]: LookupUser })
        return {
            streamId: channelId,
            spaceId: spaceId,
            users,
            usersMap,
        } satisfies UserLookupContextType
    }, [room, props.fallbackToParentContext, channelId, parentContext?.usersMap, spaceId])

    return <UserLookupContext.Provider value={value}>{props.children}</UserLookupContext.Provider>
}

const mergeNames = (user: LookupUser, spaceId?: string) => {
    if ((!user.username || !user.displayName) && user.memberOf) {
        // find the first (not necesarilly the best, since that
        // would be subjective) alternative that has a displayName
        const matches = Object.values(user.memberOf)
            .filter((u) => u.displayName.length > 0 || u.username.length > 0)
            .sort((a, b) =>
                !spaceId
                    ? 0
                    : Math.sign(
                          spaceCompare(a.spaceId, spaceId) - spaceCompare(b.spaceId, spaceId),
                      ),
            )

        if (matches.length > 0) {
            user.username = matches[0].username
            user.displayName = matches[0].displayName
        }
    }
}

const spaceCompare = (memberStreamId: string, currentStreamId: string) =>
    memberStreamId === currentStreamId ? -1 : 1
