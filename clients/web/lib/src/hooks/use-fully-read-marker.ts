import { useFullyReadMarkerStore } from '../store/use-fully-read-marker-store'
import { RoomIdentifier } from '../types/room-identifier'
import { FullyReadMarker } from '../types/timeline-types'

export function useFullyReadMarker(
    channelId?: RoomIdentifier,
    threadParentId?: string,
): FullyReadMarker | undefined {
    const id = threadParentId ?? channelId?.matrixRoomId
    const fullyReadMarker: FullyReadMarker | undefined = useFullyReadMarkerStore((state) =>
        id ? state.markers[id] : undefined,
    )
    //console.log('fully read marker', { fullyReadMarker, id })
    return fullyReadMarker
}
