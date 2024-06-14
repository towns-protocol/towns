import { useMyProfile, useUserLookupContext } from 'use-towns-client'
import { firstBy } from 'thenby'
import { useMemo } from 'react'
import { notUndefined } from 'ui/utils/utils'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'

const commaAndSequence = (arrLength: number, index: number) => {
    if (arrLength <= 1 || index === arrLength - 1) {
        return ''
    }

    if (index === arrLength - 2) {
        return ' and '
    }

    return ', '
}

export const useNameSequence = (users: Record<string, { eventId: string }>) => {
    const { lookupUser } = useUserLookupContext()
    const displayName = useMyProfile()?.displayName

    return useMemo(() => {
        return Array.from(Object.keys(users))
            .map((u) => {
                const name = getPrettyDisplayName(lookupUser(u))
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
                return `${str} ${name}${commaAndSequence(arr.length, index)}`
            }, '')
    }, [users, lookupUser, displayName])
}
