import { RoomIdentifier } from '../types/room-identifier'
import { useFullyReadMarker } from './use-fully-read-marker'

export function useChannelNotificationCounts(channelId: RoomIdentifier) {
    const fullyReadMarker = useFullyReadMarker(channelId)
    return {
        isUnread: fullyReadMarker?.isUnread === true,
        mentions: fullyReadMarker?.mentions ?? 0,
    }
}
