/* eslint-disable @typescript-eslint/no-unused-vars */
import { Membership } from '../types/zion-types'
import { RoomIdentifier } from '../types/room-identifier'
import { useCasablancaStreamMembership } from './CasablancClient/useCasablancaStreamMember'

export function useMembership(roomId?: RoomIdentifier, userId?: string) {
    const membership = useCasablancaStreamMembership(roomId, userId)
    return membership ?? Membership.None
}
