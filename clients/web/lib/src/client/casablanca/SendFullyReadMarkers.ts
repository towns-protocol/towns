import { Client as CasablancaClient } from '@towns/sdk'
import { FullyReadMarkerContent } from '@river/proto'
import { FullyReadMarker } from 'types/timeline-types'

export async function sendFullyReadMarkers(
    client: CasablancaClient,
    channelId: string,
    fullyReadMarkers: Record<string, FullyReadMarker>,
) {
    const fullyReadMarkersContentRecord: Record<string, FullyReadMarkerContent> = {}
    for (const [threadroot, fullyReadMarker] of Object.entries(fullyReadMarkers)) {
        const fullyReadMarkerContent = new FullyReadMarkerContent({
            channelId: fullyReadMarker.channelId.networkId,
            threadParentId: fullyReadMarker.threadParentId,
            eventId: fullyReadMarker.eventId,
            eventOriginServerTsEpochMs: fullyReadMarker.eventOriginServerTs
                ? BigInt(fullyReadMarker.markedReadAtTs)
                : undefined,
            isUnread: fullyReadMarker.isUnread,
            markedReadAtTsEpochMs: BigInt(fullyReadMarker.markedReadAtTs),
            markedUnreadAtTsEpochMs: BigInt(fullyReadMarker.markedUnreadAtTs),
            mentions: fullyReadMarker.mentions,
        })

        fullyReadMarkersContentRecord[threadroot] = fullyReadMarkerContent
    }
    await client.sendFullyReadMarkers(channelId, fullyReadMarkersContentRecord)
}
