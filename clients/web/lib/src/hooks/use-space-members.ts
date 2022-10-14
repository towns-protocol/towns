import { useSpaceContext } from '../components/SpaceContextProvider'
import { useMembers } from './use-members'

/**
 * Returns all members from the space in the current space context
 */
export function useSpaceMembers() {
    const { spaceId } = useSpaceContext()
    return useMembers(spaceId)
}
