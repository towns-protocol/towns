import { memoize } from 'lodash'
import { shortAddress } from 'ui/utils/utils'

interface UserWithDisplayName {
    userId: string
    displayName: string
    username?: string
}

/**
 * matrix will suffix displayNames that collides like the following:
 * user_name (@eip155=3a5=3a0x2fff60b7bccec9b234a2f07448d3b2c045d60022:node1-test.towns.com)
 * this method will return the display name with a cleaner suffix
 */

export function getPrettyDisplayName(user: UserWithDisplayName | undefined): string {
    const name = !user ? undefined : user.displayName
    // memoized result
    return _getPrettyDisplayName(name, user?.username, user?.userId)
}

export const _getPrettyDisplayName = memoize(
    (name?: string, username?: string, userId?: string) => {
        if (name && name.length > 0) {
            return name
        }

        if (username && username.length > 0) {
            return username
        }

        if (userId) {
            return shortAddress(userId)
        }

        return 'Unknown User'
    },
    (name, username, userId) => (userId ?? '') + (username ?? '') + (name ?? ''),
)
