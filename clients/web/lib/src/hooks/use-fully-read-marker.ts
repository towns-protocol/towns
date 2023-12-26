import { FullyReadMarker } from '@river/proto'
import { useFullyReadMarkerStore } from '../store/use-fully-read-marker-store'

export function useFullyReadMarker(
    channelId?: string,
    threadParentId?: string,
): FullyReadMarker | undefined {
    const id = threadParentId ?? channelId
    const fullyReadMarker: FullyReadMarker | undefined = useFullyReadMarkerStore((state) =>
        id ? state.markers[id] : undefined,
    )
    //console.log('fully read marker', { fullyReadMarker, id })
    return fullyReadMarker
}
