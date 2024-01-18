import { memoize } from 'lodash'
import { shortAddress } from 'ui/utils/utils'

interface UserWithDisplayName {
    userId: string
    displayName: string
    username?: string
}

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
