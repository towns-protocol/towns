import { memoize } from 'lodash'
import { shortAddress } from 'ui/utils/utils'

export interface UserWithDisplayName {
    userId: string
    displayName: string
    username?: string
    ensName?: string
}

/**
 * @desc Get a pretty display name for a user
 * @param {UserWithDisplayName} user - User object
 * @param {boolean} dontRemoveEth - used when displaying name in `RichTextPreview`. The mentions[] returned from backend along
 * with the message does not have `ensName` attribute.
 * In that case, we don't want to remove `.eth` from the name and show it as is
 */
export function getPrettyDisplayName(
    user: UserWithDisplayName | undefined,
    dontRemoveEth: boolean = false,
): string {
    const name = !user ? undefined : user.displayName
    // memoized result
    return _getPrettyDisplayName(name, user?.username, user?.userId, user?.ensName, dontRemoveEth)
}

// .eth is only allowed for verified ens names
const removeDotEth = (name: string) => name.replace(/\.eth$/, '')

export const _getPrettyDisplayName = memoize(
    (
        name?: string,
        username?: string,
        userId?: string,
        ensName?: string,
        dontRemoveEth = false,
    ) => {
        if (ensName && ensName.length > 0) {
            return ensName
        }
        if (name && name.length > 0) {
            return dontRemoveEth ? name : removeDotEth(name)
        }

        if (username && username.length > 0) {
            return removeDotEth(username)
        }

        if (userId) {
            return shortAddress(userId)
        }

        return 'Unknown User'
    },
    (name, username, userId, ensName, dontRemoveEth) =>
        (userId ?? '') + (username ?? '') + (name ?? '') + (ensName ?? '') + String(dontRemoveEth),
)
