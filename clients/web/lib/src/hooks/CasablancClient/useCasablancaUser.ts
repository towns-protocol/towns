import { Client as CasablancaClient } from '@towns-protocol/sdk'
import { TownsStreamMember } from '../../types/towns-types'

export function useCasablancaUser(
    userId?: string,
    client?: CasablancaClient,
): TownsStreamMember | undefined {
    // TODO https://linear.app/hnt-labs/issue/HNT-634/getroom-for-casablanca
    if (!userId || !client) {
        return undefined
    }
    //TODO: We need to add support of displayName, lastPresenceTs and currentlyActive on River level
    //or get rid of it completely.
    const currentUser: TownsStreamMember = {
        userId: userId,
        username: userId,
        usernameConfirmed: true,
        usernameEncrypted: false,
        displayName: userId,
        displayNameEncrypted: false,
    }
    return currentUser
}
