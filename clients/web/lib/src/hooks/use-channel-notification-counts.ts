import { useZionContext } from '../components/ZionContextProvider'
import { RoomIdentifier } from '../types/matrix-types'
import { useFullyReadMarker } from './use-fully-read-marker'

export function useChannelNotificationCounts(channelId: RoomIdentifier) {
    const { mentionCounts } = useZionContext() // aellis 11.2022 this should come out of the context
    const fullyReadMarker = useFullyReadMarker(channelId)
    return {
        isUnread: fullyReadMarker?.isUnread === true,
        mentions: mentionCounts[channelId.matrixRoomId] ?? 0,
    }
}
