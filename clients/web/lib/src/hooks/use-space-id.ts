import { useSpaceContext } from '../components/SpaceContextProvider'

export function useSpaceId() {
    const { spaceId } = useSpaceContext()
    return spaceId
}
