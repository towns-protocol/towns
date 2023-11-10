import { useMyProfile, useSpaceMembers } from 'use-zion-client'
import { firstBy } from 'thenby'
import { useMemo } from 'react'
import { notUndefined } from 'ui/utils/utils'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'

export const useNameSequence = (users: Record<string, { eventId: string }>) => {
    const { membersMap } = useSpaceMembers()
    const displayName = useMyProfile()?.displayName

    return useMemo(() => {
        return Array.from(Object.keys(users))
            .map((u) => {
                const name = getPrettyDisplayName(membersMap[u]).displayName
                if (!name) {
                    return undefined
                } else if (name === displayName) {
                    return 'You'
                } else {
                    return `${name}`
                }
            })
            .filter(notUndefined)
            .sort(firstBy((a) => a !== 'You'))
            .reduce((str, name, index, arr) => {
                return `${str} ${name}${
                    // nothing to add for single names or last name
                    arr.length <= 1 || index === arr.length - 1
                        ? ``
                        : // "and" for next to last
                        index === arr.length - 2
                        ? `, and `
                        : `, `
                }`
            }, '')
    }, [displayName, membersMap, users])
}
