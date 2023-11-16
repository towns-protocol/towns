import React, { useMemo, useRef } from 'react'
import { useAllKnownUsers } from 'use-zion-client'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'

type UserName = {
    userId: string
    displayName: string
}

type Props = {
    excludeSelf?: boolean
    maxNames?: number
    userIds: string[]

    renderUser?: (user: { userId: string; displayName: string }) => void
}

export const UserList = (props: Props) => {
    const userList = useUserList(props)
    return <>{userList}</>
}

export const useUserList = (params: Props) => {
    const { excludeSelf, userIds, maxNames = 8 } = params

    const stableRenderRef = useRef(params.renderUser)
    const renderUser = (stableRenderRef.current = params.renderUser)

    const { usersMap } = useAllKnownUsers()
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
            .slice(0, maxNames)
            .concat(members.length >= maxNames ? 'others' : excludeSelf ? [] : 'you')
            .reduce((acc, m, i, arr) => {
                if (i > 0) {
                    acc.push(i < arr.length - 1 ? ', ' : ' and ')
                }
                acc.push(m)
                return acc
            }, [] as (string | UserName)[])
    }, [excludeSelf, maxNames, members])

    return fragments.map((f) => {
        return typeof f === 'string' ? f : renderUser ? renderUser(f) : f.displayName
    })
}
