import { useSpaceContext } from '../components/SpaceContextProvider'
import { useTimeline } from './use-timeline'

export function useSpaceTimeline() {
    const { spaceId } = useSpaceContext()
    return useTimeline(spaceId)
}
