import React, { useMemo, useRef, useEffect } from 'react'
import { useAllKnownUsers } from '../hooks/use-all-known-users'
import { useRoomWithStreamId } from '../hooks/use-room'
import { useSpaceContext } from './SpaceContextProvider'
import isEqual from 'lodash/isEqual'
import { UserLookupContext } from './UserLookupContext'
import { useUserLookupContext } from '../hooks/use-user-lookup-context'
import { LookupUser, LookupUserMap, UserLookupContextType } from '../types/user-lookup'
import { useAllSpaceUsers } from '../hooks/use-all-space-users'
import { OfflineUser, useOfflineStore, generateOfflineUserKey } from '../store/use-offline-store'

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
    const { users: allSpaceUsers } = useAllSpaceUsers(spaceId)
    const { setOfflineUser } = useOfflineStore()

    const usersCache = useRef<LookupUserMap>({})

    const users = useMemo(() => {
        if (!spaceId) {
            return []
        }
        return allSpaceUsers.map((member) => {
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
    }, [allSpaceUsers, parentContextUsersMap, spaceId])

    useEffect(() => {
        if (!spaceId) {
            return
        }
        users.forEach((user) => {
            const offlineUserKey = generateOfflineUserKey(spaceId, user.userId)
            if (user.username) {
                setOfflineUser(offlineUserKey, {
                    userId: user.userId,
                    username: user.username,
                    displayName: user.displayName,
                } as OfflineUser)
            }
        })
    }, [setOfflineUser, spaceId, users])

    const value = useMemo(() => {
        // avoid overriding parent context if spaceId isn't set (e.g DM channels)
        if (spaceId) {
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
    }, [parentContextUsers, parentContextUsersMap, spaceId, users])

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
    const { offlineUserMap, setOfflineUser } = useOfflineStore()

    const users = useMemo(() => {
        if (!room) {
            return []
        }
        return room.members.map((member) => ({
            ...member,
            memberOf: parentContext?.usersMap[member.userId]?.memberOf,
        }))
    }, [room, parentContext?.usersMap])

    const allUsers = useMemo(() => {
        if (!room) {
            return []
        }
        return Object.values(room.membersMap).map((member) => ({
            ...member,
            memberOf: parentContext?.usersMap[member.userId]?.memberOf,
        }))
    }, [room, parentContext?.usersMap])

    useEffect(() => {
        if (!spaceId) {
            return
        }
        users.forEach((user) => {
            const offlineUserKey = generateOfflineUserKey(spaceId, user.userId)
            if (user.username) {
                setOfflineUser(offlineUserKey, {
                    userId: user.userId,
                    username: user.username,
                    displayName: user.displayName,
                } as OfflineUser)
            }
        })
    }, [spaceId, setOfflineUser, users])

    const value = useMemo(() => {
        if (!room) {
            return {
                users: [],
                usersMap: {},
            }
        }

        // opportunistically fill in displayName from parent context if
        // allowed. This is designed for the DM channels within spaces
        if (props.fallbackToParentContext) {
            allUsers.forEach((u) => mergeNames({ user: u, spaceId, offlineUserMap }))
            users.forEach((u) => mergeNames({ user: u, spaceId, offlineUserMap }))
        }
        const usersMap = allUsers.reduce((acc, user) => {
            acc[user.userId] = user
            return acc
        }, {} as { [key: string]: LookupUser })

        // populate data from local cache
        Object.entries(offlineUserMap).forEach(([key, offlineUser]) => {
            const [_spaceId, userId] = key.split('-')
            if (spaceId === _spaceId && offlineUser && userId) {
                const user = usersMap[userId]
                if (!user) {
                    usersMap[userId] = {
                        userId: offlineUser.userId,
                        username: offlineUser.username,
                        usernameConfirmed: false,
                        usernameEncrypted: false,
                        displayName: offlineUser.displayName ?? '',
                        displayNameEncrypted: false,
                    }
                }
            }
        })

        return {
            streamId: channelId,
            spaceId: spaceId,
            users,
            usersMap,
        } satisfies UserLookupContextType
    }, [room, props.fallbackToParentContext, allUsers, offlineUserMap, channelId, spaceId, users])

    return <UserLookupContext.Provider value={value}>{props.children}</UserLookupContext.Provider>
}

interface MergeNamesParams {
    user: LookupUser
    spaceId?: string
    offlineUserMap: Record<string, OfflineUser | undefined>
}

const mergeNames = ({ user, spaceId, offlineUserMap }: MergeNamesParams) => {
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
        } else if (offlineUserMap[user.userId]) {
            user.username = offlineUserMap[user.userId]!.username
            user.displayName = offlineUserMap[user.userId]!.displayName ?? ''
        }
    }
}

const spaceCompare = (memberStreamId: string, currentStreamId: string) =>
    memberStreamId === currentStreamId ? -1 : 1
