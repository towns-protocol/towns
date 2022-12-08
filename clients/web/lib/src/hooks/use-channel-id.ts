import { RoomIdentifier } from '../types/matrix-types'
import { useChannelContext } from '../components/ChannelContextProvider'

export function useChannelId(): RoomIdentifier {
    const { channelId } = useChannelContext()
    return channelId
}
