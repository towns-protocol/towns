import { useZionContext } from '../components/ZionContextProvider'
import { RoomIdentifier } from '../types/matrix-types'

export function useSpaceNotificationCounts(spaceId: RoomIdentifier): {
    isUnread: boolean
    mentions: number
} {
    const { spaceUnreads, spaceMentionCounts } = useZionContext() // aellis 11.2022 this should come out of the context
    const isUnread = spaceUnreads[spaceId.matrixRoomId] ?? false
    const mentions = spaceMentionCounts[spaceId.matrixRoomId] ?? 0
    return {
        isUnread,
        mentions: mentions,
    }
}
