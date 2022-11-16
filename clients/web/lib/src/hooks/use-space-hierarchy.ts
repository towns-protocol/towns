import { useZionContext } from '../components/ZionContextProvider'
import { RoomIdentifier } from '../types/matrix-types'

export function useSpaceHierarchy(spaceId: RoomIdentifier) {
    const { spaceHierarchies } = useZionContext()
    return spaceHierarchies[spaceId.matrixRoomId]
}
