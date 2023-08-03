import { RoomIdentifier } from '../types/room-identifier'
import { useChannelContext } from '../components/ChannelContextProvider'

export function useChannelId(): RoomIdentifier {
    const { channelId } = useChannelContext()
    return channelId
}
