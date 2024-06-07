import { useMembers } from './use-members'
import { useSpaceContext } from '../components/SpaceContextProvider'
import { useTownsContext } from '../components/TownsContextProvider'
import { useMemo } from 'react'
import { useSpaceIdStore } from './TownsContext/useSpaceIds'
import { isDefined } from '../utils/isDefined'

/**
 * Returns all members from the space in the current space context
 */
export function useSpaceMembers() {
    const { spaceId } = useSpaceContext()
    return useMembers(spaceId)
}

export function useSpaceMembersWithFallback(spaceId?: string | undefined) {
    const { spaceIds: allSpaceIds } = useSpaceIdStore()
    const { rooms } = useTownsContext()
    const spaceIds = useMemo(() => (spaceId ? [spaceId] : allSpaceIds), [spaceId, allSpaceIds])
    const memberIds = useMemo(
        () =>
            Array.from(
                new Set(spaceIds.flatMap((spaceId) => rooms[spaceId]?.members).filter(isDefined)),
            ),
        [rooms, spaceIds],
    )

    return { memberIds }
}
