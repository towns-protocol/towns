import memoize from 'lodash/memoize'
import { useUserLookupStore } from '../store/use-user-lookup-store'
import { LookupUser } from '../types/user-lookup'

export function useUser(userId?: string): LookupUser | undefined {
    const lookupUser = useUserLookupStore((s) => s.lookupUser)

    return userId ? lookupUser(userId) ?? getStableDefault(userId) : undefined
}

const getStableDefault = memoize(
    (userId: string): LookupUser => {
        return {
            userId,
            username: '',
            usernameConfirmed: true,
            usernameEncrypted: false,
            displayName: '',
            displayNameEncrypted: false,
        } satisfies LookupUser
    },
    (userId) => userId,
)
