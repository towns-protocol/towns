import { Client as CasablancaClient } from '@river/sdk'
import { User } from '../../types/zion-types'

export function useCasablancaUser(userId?: string, client?: CasablancaClient): User | undefined {
    // TODO https://linear.app/hnt-labs/issue/HNT-634/getroom-for-casablanca
    if (!userId || !client) {
        return undefined
    }
    //TODO: We need to add support of displayName, lastPresenceTs and currentlyActive on River level
    //or get rid of it completely.
    const currentUser: User = {
        userId: userId,
        displayName: userId,
        lastPresenceTs: 0,
        currentlyActive: true,
    }
    return currentUser
}
