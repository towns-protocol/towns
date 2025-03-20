/* eslint-disable @typescript-eslint/no-unused-vars */
import { Membership } from '@towns-protocol/sdk'
import { useCasablancaStreamMembership } from './CasablancClient/useCasablancaStreamMember'

export function useMembership(roomId?: string, userId?: string) {
    const membership = useCasablancaStreamMembership(roomId, userId)
    return membership ?? Membership.None
}
