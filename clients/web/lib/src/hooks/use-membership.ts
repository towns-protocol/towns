/* eslint-disable @typescript-eslint/no-unused-vars */
import { useMemo } from 'react'
import { Membership } from '../types/matrix-types'
import { RoomIdentifier } from '../types/room-identifier'
import { useMember } from './use-member'

export function useMembership(roomId?: RoomIdentifier, userId?: string): Membership {
    const member = useMember(roomId, userId)
    return useMemo(() => member?.membership ?? Membership.None, [member?.membership])
}
