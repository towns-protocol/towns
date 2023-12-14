import { useMembers } from './use-members'
import { useSpaceContext } from '../components/SpaceContextProvider'

/**
 * Returns all members from the space in the current space context
 */
export function useSpaceMembers() {
    const { spaceId } = useSpaceContext()
    return useMembers(spaceId)
}
