import { Client as CasablancaClient } from '@towns/sdk'
import { FullyReadMarkerContent } from '@towns/proto'
import { Timestamp } from '@bufbuild/protobuf'
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
            eventOriginServerTs: fullyReadMarker.eventOriginServerTs
                ? Timestamp.fromDate(new Date(fullyReadMarker.markedReadAtTs))
                : undefined,
            isUnread: fullyReadMarker.isUnread,
            markedReadAtTs: Timestamp.fromDate(new Date(fullyReadMarker.markedReadAtTs)),
            markedUnreadAtTs: Timestamp.fromDate(new Date(fullyReadMarker.markedUnreadAtTs)),
            mentions: fullyReadMarker.mentions,
        })

        fullyReadMarkersContentRecord[threadroot] = fullyReadMarkerContent
    }
    await client.sendFullyReadMarkers(channelId, fullyReadMarkersContentRecord)
}
