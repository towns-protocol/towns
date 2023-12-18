import { useZionContext } from '../components/ZionContextProvider'
import { RoomIdentifier } from '../types/room-identifier'

export function useSpaceNotificationCounts(spaceId: RoomIdentifier): {
    isUnread: boolean
    mentions: number
} {
    const { spaceUnreads, spaceMentions } = useZionContext() // aellis 11.2022 this should come out of the context
    const isUnread = spaceUnreads[spaceId.streamId] ?? false
    const mentions = spaceMentions[spaceId.streamId] ?? 0
    return {
        isUnread,
        mentions: mentions,
    }
}
