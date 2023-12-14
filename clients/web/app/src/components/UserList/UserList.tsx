import React, { useMemo, useRef } from 'react'
import { firstBy } from 'thenby'
import { RoomMember, useUserLookupContext } from 'use-zion-client'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'

type UserName = {
    userId: string
    displayName: string
}

type Props = {
    excludeSelf?: boolean
    maxNames?: number
    userIds: string[]

    renderUser?: (user: { userId: string; displayName: string; key: string }) => void
}

export const UserList = (props: Props) => {
    const userList = useUserList(props)
    return <>{userList}</>
}

export const useUserList = (params: Props) => {
    const { excludeSelf, userIds, maxNames = 3 } = params

    const stableRenderRef = useRef(params.renderUser)
    const renderUser = (stableRenderRef.current = params.renderUser)

    const { usersMap } = useUserLookupContext()
    const members = useMemo(() => {
        return userIds.map((u) => {
            return {
                userId: u,
                displayName: getPrettyDisplayName(usersMap[u] ?? { name: u })?.displayName,
            }
        })
    }, [usersMap, userIds])

    const fragments = useMemo(() => {
        if (members.length === 0) {
            return excludeSelf ? [] : ['You']
        }

        return (members as (UserName | string)[])
            .slice(0, members.length <= maxNames ? maxNames : maxNames - 1)
            .concat(members.length > maxNames ? 'others' : excludeSelf ? [] : 'you')
            .reduce((acc, m, i, arr) => {
                if (i > 0) {
                    acc.push(i < arr.length - 1 ? ', ' : ' and ')
                }
                acc.push(m)
                return acc
            }, [] as (string | UserName)[])
    }, [excludeSelf, maxNames, members])

    return fragments.map((f) => {
        return typeof f === 'string'
            ? f
            : renderUser
            ? renderUser({ ...f, key: f.userId })
            : f.displayName
    })
}

const SORT_CURRENT_USER = {
    first: -1,
    last: 1,
    not: 0,
} as const

/**
 *
 */
export const getNameListFromUsers = (
    users: RoomMember[],
    currentUserId?: string,
    options: {
        maxNames?: number
    } = {},
) => {
    const { maxNames = 3 } = options
    const sortCurrentUser = users.length > maxNames ? 'first' : 'last'

    const mappedUsers = users
        .slice()
        .sort(
            firstBy((u: RoomMember) =>
                u?.userId === currentUserId ? SORT_CURRENT_USER[sortCurrentUser] : 0,
            ).thenBy((u: RoomMember) => u?.displayName, -1),
        )
        .map((u?: RoomMember) =>
            u?.userId === currentUserId ? 'you' : getPrettyDisplayName(u).displayName,
        )

    const truncateUsers =
        mappedUsers.length > maxNames
            ? mappedUsers
                  .slice(0, maxNames - 1)
                  .concat([`${mappedUsers.length - maxNames - 1} others`])
            : mappedUsers

    return truncateUsers.reduce(
        (acc, name, index, arr) =>
            index === 0
                ? name
                : index === arr.length - 1
                ? `${acc} and ${name}`
                : `${acc}, ${name}`,
        '',
    )
}
