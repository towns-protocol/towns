import { FullyReadMarker } from '@river/proto'
import { useFullyReadMarkerStore } from '../store/use-fully-read-marker-store'
import { RoomIdentifier } from '../types/room-identifier'

export function useFullyReadMarker(
    channelId?: RoomIdentifier,
    threadParentId?: string,
): FullyReadMarker | undefined {
    const id = threadParentId ?? channelId?.networkId
    const fullyReadMarker: FullyReadMarker | undefined = useFullyReadMarkerStore((state) =>
        id ? state.markers[id] : undefined,
    )
    //console.log('fully read marker', { fullyReadMarker, id })
    return fullyReadMarker
}
