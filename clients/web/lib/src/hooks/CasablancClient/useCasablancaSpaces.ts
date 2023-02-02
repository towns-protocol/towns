import { Client as CasablancaClient } from '@zion/client'
import { SpaceItem } from '../../types/zion-types'
import { RoomIdentifier } from '../../types/room-identifier'

export function useCasablancaSpaces(
    spaceIds: RoomIdentifier[],
    casablancaClient?: CasablancaClient,
): SpaceItem[] {
    // TODO https://linear.app/hnt-labs/issue/HNT-634/getroom-for-casablanca
    if (spaceIds.length === 0 || !casablancaClient) {
        return []
    }
    return []
}
