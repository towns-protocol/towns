import { Client as CasablancaClient } from '@river-build/sdk'
import { RoomMember } from '../../types/towns-types'

export function useCasablancaUser(
    userId?: string,
    client?: CasablancaClient,
): RoomMember | undefined {
    // TODO https://linear.app/hnt-labs/issue/HNT-634/getroom-for-casablanca
    if (!userId || !client) {
        return undefined
    }
    //TODO: We need to add support of displayName, lastPresenceTs and currentlyActive on River level
    //or get rid of it completely.
    const currentUser: RoomMember = {
        userId: userId,
        username: userId,
        usernameConfirmed: true,
        usernameEncrypted: false,
        displayName: userId,
        displayNameEncrypted: false,
    }
    return currentUser
}
