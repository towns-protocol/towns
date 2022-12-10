import { useZionContext } from '../components/ZionContextProvider'
import { RoomIdentifier } from '../types/room-identifier'

export function useSpaceHierarchy(spaceId: RoomIdentifier) {
    const { spaceHierarchies } = useZionContext()
    return spaceHierarchies[spaceId.networkId]
}
