import { memoize } from 'lodash'
import { getAccountAddress } from 'use-zion-client'
import { shortAddress } from 'ui/utils/utils'

interface UserWithDisplayName {
    userId: string
    displayName: string
}

interface UserWithName {
    userId: string
    name: string
}

const isUserWithName = (user: { name: string } | { displayName: string }): user is UserWithName => {
    return typeof (user as UserWithName).name === 'string'
}

/**
 * matrix will suffix displayNames that collides like the following:
 * user_name (@eip155=3a5=3a0x2fff60b7bccec9b234a2f07448d3b2c045d60022:node1-test.towns.com)
 * this method will return the display name with a cleaner suffix
 */

export function getPrettyDisplayName(user: UserWithDisplayName | UserWithName | undefined) {
    const name = !user ? undefined : isUserWithName(user) ? user.name : user.displayName
    // memoized result
    return _getPrettyDisplayName(name, user?.userId)
}

export const _getPrettyDisplayName = memoize((name?: string, userId?: string) => {
    if (!name) {
        return {
            name: 'Unknown User',
            initialName: 'Unknown User',
            suffix: undefined,
        }
    }
    // first check if the name matches the pattern we're looking for
    const matchSuffix = name.match(/\s+\(@eip[a-z0-9=]+(0x[0-9a-f]{40}):.+\)$/)

    if (!matchSuffix) {
        return {
            name,
            initialName: name,
            suffix: undefined,
        }
    }

    // clean up then name
    const initialName = name.replace(matchSuffix[0], '')

    // even though the address is encoded in the name we want to use the actual
    // userId to prevent from faking it
    const address = userId ? getAccountAddress(userId) : undefined

    const suffix = address ? ` (${shortAddress(address)})` : undefined

    return {
        name: initialName + (suffix ? ` ${suffix}` : ''),
        initialName: initialName,
        suffix: suffix,
    }
})
