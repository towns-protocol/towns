import { Client as CasablancaClient } from '@towns/sdk'
import { FullyReadMarkerContent } from '@towns/proto'
import { Timestamp } from '@bufbuild/protobuf'
import { FullyReadMarker } from 'types/timeline-types'

export async function sendFullyReadMarker(
    client: CasablancaClient,
    fullyReadMarker: FullyReadMarker,
) {
    await client.sendFullyReadMarker(
        fullyReadMarker.channelId.networkId,
        new FullyReadMarkerContent({
            threadParentId: fullyReadMarker.threadParentId,
            eventId: fullyReadMarker.eventId,
            eventOriginServerTs: fullyReadMarker.eventOriginServerTs
                ? Timestamp.fromDate(new Date(fullyReadMarker.markedReadAtTs))
                : undefined,
            isUnread: fullyReadMarker.isUnread,
            markedReadAtTs: Timestamp.fromDate(new Date(fullyReadMarker.markedReadAtTs)),
            markedUnreadAtTs: Timestamp.fromDate(new Date(fullyReadMarker.markedUnreadAtTs)),
            mentions: fullyReadMarker.mentions,
        }),
    )
}
