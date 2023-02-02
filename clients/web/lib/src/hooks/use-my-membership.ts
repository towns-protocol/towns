import { useZionContext } from '../components/ZionContextProvider'
import { Membership } from '../types/zion-types'
import { RoomIdentifier } from '../types/room-identifier'
import { useMembership } from './use-membership'

export function useMyMembership(inRoomId?: RoomIdentifier): Membership {
    const { client } = useZionContext()
    const userId = client?.getUserId()
    return useMembership(inRoomId, userId)
}
