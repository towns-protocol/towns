/* eslint-disable @typescript-eslint/no-unused-vars */
import { Membership } from '../types/towns-types'
import { useCasablancaStreamMembership } from './CasablancClient/useCasablancaStreamMember'

export function useMembership(roomId?: string, userId?: string) {
    const membership = useCasablancaStreamMembership(roomId, userId)
    return membership ?? Membership.None
}
