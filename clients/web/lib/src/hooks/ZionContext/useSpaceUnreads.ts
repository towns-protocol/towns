import { useEffect, useState } from 'react'
import { ZionClient } from '../../client/ZionClient'
import { SpaceHierarchies } from '../../types/matrix-types'
import { useFullyReadMarkerStore } from '../../store/use-fully-read-marker-store'

export function useSpaceUnreads(
    client: ZionClient | undefined,
    spaceIds: string[],
    spaceHierarchies: SpaceHierarchies,
    bShowSpaceRootUnreads: boolean,
): { spaceUnreads: Record<string, boolean> } {
    const [spaceUnreads, setSpaceUnreads] = useState<Record<string, boolean>>({})

    useEffect(() => {
        if (!client) {
            return
        }
        // gets run every time spaceIds changes
        // console.log("USE SPACE UNREADS::running effect");
        const updateSpaceUnreads = (spaceId: string, hasUnread: boolean) => {
            setSpaceUnreads((prev) => {
                if (prev[spaceId] === hasUnread) {
                    return prev
                }
                return {
                    ...prev,
                    [spaceId]: hasUnread,
                }
            })
        }

        const runUpdate = () => {
            const markers = useFullyReadMarkerStore.getState().markers
            spaceIds.forEach((spaceId) => {
                // easy case: if the space has a fully read marker, then it's not unread
                if (bShowSpaceRootUnreads && markers[spaceId]?.isUnread === true) {
                    updateSpaceUnreads(spaceId, true)
                    return
                }
                // next, check the channels
                const childIds =
                    spaceHierarchies[spaceId]?.children.map((x) => x.id.matrixRoomId) ?? []
                const hasChannelUnread =
                    childIds.find((id) => markers[id]?.isUnread === true) != undefined
                if (hasChannelUnread) {
                    updateSpaceUnreads(spaceId, true)
                    return
                }
                // now find threads
                const childSet = new Set(childIds)
                const unreadRoot = Object.values(markers).find(
                    (marker) =>
                        marker.isUnread &&
                        marker.isParticipating &&
                        childSet.has(marker.channelId.matrixRoomId),
                )
                const hasThreadUnread = unreadRoot != undefined
                // todo, find if we're following the thread
                if (hasThreadUnread) {
                    console.log('hasThreadUnread', {
                        unreadRoot,
                        children: spaceHierarchies[spaceId]?.children,
                    })
                    updateSpaceUnreads(spaceId, true)
                    return
                }

                updateSpaceUnreads(spaceId, false)
            })
        }

        runUpdate()

        const fullyReadUnsub = useFullyReadMarkerStore.subscribe(runUpdate)
        return () => {
            fullyReadUnsub()
        }
    }, [client, spaceIds, spaceHierarchies, bShowSpaceRootUnreads])

    return { spaceUnreads }
}
