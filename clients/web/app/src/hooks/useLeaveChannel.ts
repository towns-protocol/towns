import { useTownsClient } from 'use-towns-client'
import { useFavoriteChannels } from './useFavoriteChannels'

/**
 * Custom hook that removes the channel from the user's favorites before leaving.
 */
export const useLeaveChannel = () => {
    const { leaveRoom } = useTownsClient()
    const { unfavoriteChannelId } = useFavoriteChannels()

    const leaveChannel = async (roomId: string, spaceId?: string) => {
        unfavoriteChannelId(roomId)
        return await leaveRoom(roomId, spaceId)
    }

    return { leaveChannel }
}
