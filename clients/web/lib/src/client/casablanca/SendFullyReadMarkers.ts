import { Client as CasablancaClient } from '@river/sdk'
import { FullyReadMarkerContent } from '@river/proto'
import { FullyReadMarker } from '../../types/timeline-types'

export async function sendFullyReadMarkers(
    client: CasablancaClient,
    channelId: string,
    fullyReadMarkers: Record<string, FullyReadMarker>,
) {
    const fullyReadMarkersContentRecord: Record<string, FullyReadMarkerContent> = {}
    for (const [threadroot, fullyReadMarker] of Object.entries(fullyReadMarkers)) {
        const fullyReadMarkerContent = new FullyReadMarkerContent({
            channelId: channelId,
            threadParentId: fullyReadMarker.threadParentId,
            eventId: fullyReadMarker.eventId,
            eventCreatedAtEpochMs: fullyReadMarker.eventCreatedAtEpocMs
                ? BigInt(fullyReadMarker.eventCreatedAtEpocMs)
                : undefined,
            isUnread: fullyReadMarker.isUnread,
            markedReadAtEpochMs: BigInt(fullyReadMarker.markedReadAtTs),
            markedUnreadAtEpochMs: BigInt(fullyReadMarker.markedUnreadAtTs),
            mentions: fullyReadMarker.mentions,
        })

        fullyReadMarkersContentRecord[threadroot] = fullyReadMarkerContent
    }
    await client.sendFullyReadMarkers(channelId, fullyReadMarkersContentRecord)
}
