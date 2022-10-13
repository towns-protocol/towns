import { useZionContext } from '../components/ZionContextProvider'
import { useSpaceContext } from '../components/SpaceContextProvider'
import { useTimeline } from './use-timeline'

export function useSpaceTimeline() {
    const { client } = useZionContext()
    const { spaceId } = useSpaceContext()
    const spaceRoom = spaceId ? client?.getRoom(spaceId) : undefined
    return useTimeline(spaceRoom)
}
