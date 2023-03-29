import { useZionContext } from '../components/ZionContextProvider'
import { Membership } from '../types/zion-types'
import { RoomIdentifier } from '../types/room-identifier'
import { useMembership } from './use-membership'
import { SpaceProtocol } from '../client/ZionClientTypes'

export function useMyMembership(inRoomId?: RoomIdentifier): Membership {
    const { matrixClient, casablancaClient } = useZionContext()
    const userId =
        inRoomId?.protocol === SpaceProtocol.Casablanca
            ? casablancaClient?.userId
            : matrixClient?.getUserId() ?? undefined
    return useMembership(inRoomId, userId)
}
