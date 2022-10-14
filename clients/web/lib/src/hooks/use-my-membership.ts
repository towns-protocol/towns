import { useZionContext } from '../components/ZionContextProvider'
import { Membership, RoomIdentifier } from '../types/matrix-types'
import { useMembership } from './use-membership'

export function useMyMembership(inRoomId?: RoomIdentifier): Membership {
    const { client } = useZionContext()
    const userId = client?.getUserId()
    return useMembership(inRoomId, userId)
}
